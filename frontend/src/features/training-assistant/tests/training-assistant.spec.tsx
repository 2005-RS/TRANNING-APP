import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';
import { trainingAssistantCopySource as copy } from '@/features/training-assistant/copy';
import { esTrainingAssistant } from '@/i18n/locales/es/training-assistant';
import { i18n } from '@/i18n';
import { clearAccessToken, setAccessToken } from '@/shared/lib/access-token';
import { refreshSession } from '@/shared/lib/api-mutator';
import { fakeSockets, latestSocket, type FakeSocket } from './fake-socket';

vi.mock('socket.io-client', async () => {
  const fake = await import('./fake-socket');
  return { io: fake.createFakeSocket };
});

vi.mock('@/shared/lib/api-mutator', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/api-mutator')>();
  return { ...original, refreshSession: vi.fn() };
});

const refreshSessionMock = vi.mocked(refreshSession);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(socket: FakeSocket, content: string, index = socket.sent.length - 1) {
  const sent = socket.sentAt(index);
  act(() => {
    socket.serverEmit('chat:typing', {
      conversationId: null,
      clientMessageId: sent.clientMessageId,
      isTyping: false,
    });
    socket.serverEmit('chat:response', {
      conversationId: '5f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f',
      messageId: `msg-${index}`,
      role: 'assistant',
      content,
      createdAt: '2026-09-24T12:00:00.000Z',
      clientMessageId: sent.clientMessageId,
    });
  });
}

async function openAssistant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: copy.launcherLabel }));
  const dialog = await screen.findByRole('dialog', { name: copy.name });
  const socket = latestSocket();
  return { dialog, socket };
}

async function openConnected(user: ReturnType<typeof userEvent.setup>) {
  const opened = await openAssistant(user);
  act(() => opened.socket.serverAccept());
  await within(opened.dialog).findByText(copy.status.CONNECTED);
  return opened;
}

function composer() {
  return screen.getByRole('textbox', { name: copy.composer.label });
}

describe('Training Assistant', { timeout: 15_000 }, () => {
  beforeAll(async () => {
    await import('@/features/training-assistant/components/training-assistant-panel');
  });

  beforeEach(() => {
    fakeSockets.length = 0;
    refreshSessionMock.mockReset();
    setAccessToken('in-memory-access-token');
  });

  afterEach(() => {
    clearAccessToken();
  });

  it('opens from the launcher and connects to the NestJS /chat namespace with the in-memory token', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);

    expect(fakeSockets).toHaveLength(0);
    const { dialog, socket } = await openAssistant(user);

    expect(within(dialog).getByText(copy.greeting)).toBeInTheDocument();
    expect(within(dialog).getByText(copy.status.CONNECTING)).toBeInTheDocument();
    expect(socket.url).toBe('http://localhost:3000/chat');
    expect(socket.url.toLowerCase()).not.toContain('deepseek');
    expect(socket.options.withCredentials).toBe(false);
    expect(socket.handshakeToken()).toBe('in-memory-access-token');
    expect(composer()).toHaveFocus();

    act(() => socket.serverAccept());
    expect(await within(dialog).findByText(copy.status.CONNECTED)).toBeInTheDocument();
  });

  it('sends with Enter, shows typing, then renders the assistant reply', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="client" />);
    const { dialog, socket } = await openConnected(user);

    await user.type(composer(), 'Hola{Enter}');

    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]).toEqual({
      message: 'Hola',
      clientMessageId: expect.stringMatching(UUID_V4),
      locale: 'en',
    });
    expect(composer()).toHaveValue('');
    const log = within(dialog).getByRole('log');
    expect(within(log).getByText('Hola')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('chat:typing', {
        conversationId: null,
        clientMessageId: socket.sentAt(0).clientMessageId,
        isTyping: true,
      }),
    );
    expect(within(dialog).getByRole('status')).toHaveTextContent(copy.typing);

    reply(socket, '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?');

    expect(
      within(log).getByText('¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(copy.typing)).not.toBeInTheDocument();

    await user.type(composer(), 'entrenamiento{Enter}');
    expect(socket.sent[1]).toMatchObject({
      message: 'entrenamiento',
      conversationId: '5f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f',
    });
  });

  it('inserts a new line with Shift+Enter and never sends empty messages', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { socket } = await openConnected(user);
    const send = screen.getByRole('button', { name: copy.composer.send });

    expect(send).toBeDisabled();
    await user.type(composer(), '   {Enter}');
    expect(socket.sent).toHaveLength(0);

    await user.clear(composer());
    await user.type(composer(), 'line one{Shift>}{Enter}{/Shift}line two');
    expect(composer()).toHaveValue('line one\nline two');
    expect(socket.sent).toHaveLength(0);

    await user.click(send);
    expect(socket.sentAt(0).message).toBe('line one\nline two');
  });

  it('prevents duplicate sends while a reply is pending', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { socket } = await openConnected(user);

    await user.type(composer(), 'first{Enter}');
    await user.type(composer(), 'second{Enter}');

    expect(socket.sent).toHaveLength(1);
    expect(screen.getByRole('button', { name: copy.composer.send })).toBeDisabled();
    expect(composer()).toHaveValue('second');

    reply(socket, 'done');
    await user.type(composer(), '{Enter}');
    expect(socket.sent).toHaveLength(2);
  });

  it('sends quick prompts through the same WebSocket path', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="client" />);
    const { dialog, socket } = await openConnected(user);

    const prompts = within(dialog).getByRole('group', { name: copy.quickPromptsLabel });
    await user.click(within(prompts).getByRole('button', { name: copy.quickPrompts.nutrition }));

    expect(socket.sent[0]).toMatchObject({ message: copy.quickPrompts.nutrition });
    expect(within(dialog).queryByRole('group', { name: copy.quickPromptsLabel })).not.toBeInTheDocument();
  });

  it('shows the reconnecting state, fails the in-flight message, and lets the user retry', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { dialog, socket } = await openConnected(user);

    await user.type(composer(), 'Hola{Enter}');
    act(() => socket.drop('transport close'));

    expect(within(dialog).getByText(copy.banner.reconnecting)).toBeInTheDocument();
    expect(within(dialog).getByText(copy.status.RECONNECTING)).toBeInTheDocument();
    expect(within(dialog).getByText(copy.errors.CONNECTION_LOST)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: copy.retry })).not.toBeInTheDocument();

    act(() => socket.serverAccept());
    await user.click(await within(dialog).findByRole('button', { name: copy.retry }));

    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[1]).toMatchObject({
      message: 'Hola',
      clientMessageId: socket.sentAt(0).clientMessageId,
    });
    reply(socket, 'ok');
    expect(within(dialog).queryByText(copy.errors.CONNECTION_LOST)).not.toBeInTheDocument();
  });

  it('shows the disconnected state with a manual reconnect', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { dialog, socket } = await openConnected(user);

    act(() => socket.drop('io server disconnect'));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(copy.banner.disconnected);
    const connectsBefore = socket.connectCalls;
    await user.click(within(dialog).getByRole('button', { name: copy.banner.reconnect }));
    expect(socket.connectCalls).toBe(connectsBefore + 1);
    expect(within(dialog).getByText(copy.status.CONNECTING)).toBeInTheDocument();
  });

  it('renders a safe server error and retries on demand', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { dialog, socket } = await openConnected(user);

    await user.type(composer(), 'Hola{Enter}');
    act(() =>
      socket.serverEmit('chat:error', {
        code: 'AI_UNAVAILABLE',
        message: 'The assistant cannot reply right now. Please try again shortly.',
        clientMessageId: socket.sentAt(0).clientMessageId,
        retryable: true,
      }),
    );

    expect(within(dialog).getByText(copy.errors.AI_UNAVAILABLE)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: copy.retry }));
    expect(socket.sent).toHaveLength(2);
  });

  it('refreshes an expired session and resends the pending message automatically', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'authenticated' });
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { dialog, socket } = await openConnected(user);

    await user.type(composer(), 'Hola{Enter}');
    act(() => {
      socket.serverEmit('chat:error', {
        code: 'AUTH_EXPIRED',
        message: 'Your session needs to be refreshed.',
        clientMessageId: socket.sentAt(0).clientMessageId,
        retryable: true,
      });
      socket.drop('io server disconnect');
    });

    await waitFor(() => expect(refreshSessionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(socket.connectCalls).toBe(2));
    act(() => socket.serverAccept());

    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[1]).toMatchObject({ message: 'Hola' });
    expect(within(dialog).queryByText(copy.errors.CONNECTION_LOST)).not.toBeInTheDocument();
  });

  it('shows session-expired when the handshake is rejected and refresh fails', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'unauthenticated' });
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { dialog, socket } = await openAssistant(user);

    act(() => socket.serverReject('UNAUTHORIZED'));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(copy.banner.sessionExpired);
    expect(within(dialog).getByText(copy.status.ERROR)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: copy.banner.reconnect })).not.toBeInTheDocument();
  });

  it('closes with Escape, restores focus, and keeps the conversation', async () => {
    const user = userEvent.setup();
    render(<TrainingAssistant placement="productivity" />);
    const { socket } = await openConnected(user);
    await user.type(composer(), 'Hola{Enter}');
    reply(socket, 'Respuesta');

    await user.keyboard('{Escape}');

    const launcher = screen.getByRole('button', { name: copy.launcherLabel });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(launcher).toHaveFocus());

    await user.click(launcher);
    expect(await screen.findByText('Respuesta')).toBeInTheDocument();
    expect(fakeSockets).toHaveLength(1);
  });

  it('hides the launcher in workout focus mode', () => {
    render(<TrainingAssistant placement="client" hidden />);
    expect(screen.queryByRole('button', { name: copy.launcherLabel })).not.toBeInTheDocument();
  });

  it('uses the Spanish copy and locale', async () => {
    await i18n.changeLanguage('es');
    const user = userEvent.setup();
    render(<TrainingAssistant placement="client" />);

    await user.click(screen.getByRole('button', { name: esTrainingAssistant.launcherLabel }));
    const dialog = await screen.findByRole('dialog', { name: 'Training Assistant' });
    expect(within(dialog).getByText(esTrainingAssistant.greeting as string)).toBeInTheDocument();
    const socket = latestSocket();
    act(() => socket.serverAccept());

    await user.type(
      screen.getByPlaceholderText(esTrainingAssistant.composer?.placeholder as string),
      'Hola{Enter}',
    );
    expect(socket.sent[0]).toMatchObject({ locale: 'es' });
  });

  describe('public website placement', () => {
    it('connects anonymously to /public-chat without sending the in-memory token', async () => {
      const user = userEvent.setup();
      render(<TrainingAssistant placement="public" />);
      const { dialog, socket } = await openAssistant(user);

      expect(socket.url).toBe('http://localhost:3000/public-chat');
      expect(socket.options.auth).toBeUndefined();
      expect(socket.handshakeToken()).toBeUndefined();
      expect(within(dialog).getByText(copy.public.greeting)).toBeInTheDocument();
      expect(within(dialog).queryByText(copy.greeting)).not.toBeInTheDocument();
      expect(composer()).toHaveAttribute('maxlength', '500');
    });

    it('offers onboarding questions instead of a buy action', async () => {
      const user = userEvent.setup();
      render(<TrainingAssistant placement="public" />);
      const { dialog, socket } = await openConnected(user);

      const prompts = within(dialog).getByRole('group', { name: copy.quickPromptsLabel });
      expect(within(prompts).queryByRole('button', { name: /comprar|buy/i })).not.toBeInTheDocument();
      expect(
        within(prompts).getByRole('button', { name: copy.public.quickPrompts.start }),
      ).toBeInTheDocument();
      expect(
        within(prompts).getByRole('button', { name: copy.public.quickPrompts.plans }),
      ).toBeInTheDocument();
      await user.click(within(prompts).getByRole('button', { name: copy.public.quickPrompts.start }));
      expect(socket.sent[0]).toMatchObject({ message: copy.public.quickPrompts.start });
    });

    it('explains when the daily public quota is exhausted and never refreshes a session', async () => {
      const user = userEvent.setup();
      render(<TrainingAssistant placement="public" />);
      const { dialog, socket } = await openConnected(user);
      await user.type(composer(), 'Hello{Enter}');

      act(() =>
        socket.serverEmit('chat:error', {
          code: 'QUOTA_EXHAUSTED',
          message: 'The public assistant reached its message limit for today.',
          clientMessageId: socket.sentAt(0).clientMessageId,
          retryable: false,
        }),
      );

      expect(within(dialog).getByText(copy.errors.QUOTA_EXHAUSTED)).toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: copy.retry })).not.toBeInTheDocument();
      expect(refreshSessionMock).not.toHaveBeenCalled();
    });
  });
});
