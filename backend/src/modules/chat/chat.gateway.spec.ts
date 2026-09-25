import { Logger } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { ChatConnectionAuthService } from './chat-connection-auth.service';
import { CHAT_EVENTS, CHAT_MAX_CONNECTIONS_PER_USER } from './chat.constants';
import { ChatError } from './chat.error';
import { ChatGateway, ChatSocket } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatPrincipal } from './types/chat.types';

const CLIENT_MESSAGE_ID = '0b8f6a52-6a0e-4c52-9d3c-1f2e3a4b5c6d';

const PRINCIPAL: ChatPrincipal = {
  userId: 'user-1',
  role: UserRole.CLIENT,
  sessionId: 'session-1',
  tokenExpiresAt: Date.now() + 600_000,
};

type Middleware = (
  socket: ChatSocket,
  next: (error?: Error & { data?: unknown }) => void,
) => void;

function fakeSocket(token?: unknown) {
  const socket = {
    data: {},
    handshake: { auth: token === undefined ? {} : { token } },
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return socket as unknown as ChatSocket & {
    emit: jest.Mock;
    disconnect: jest.Mock;
  };
}

function build(options: {
  authenticate?: jest.Mock;
  assertStillValid?: jest.Mock;
  sendMessage?: jest.Mock;
}) {
  const connectionAuth = {
    authenticate:
      options.authenticate ?? jest.fn(() => Promise.resolve(PRINCIPAL)),
    assertStillValid:
      options.assertStillValid ?? jest.fn(() => Promise.resolve()),
  };
  const chat = {
    sendMessage:
      options.sendMessage ??
      jest.fn(() =>
        Promise.resolve({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          role: 'assistant',
          content: '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
          createdAt: '2026-09-24T12:00:00.000Z',
        }),
      ),
  };
  const gateway = new ChatGateway(
    connectionAuth as unknown as ChatConnectionAuthService,
    chat as unknown as ChatService,
  );
  let middleware: Middleware = () => undefined;
  gateway.afterInit({
    use: (fn: Middleware) => {
      middleware = fn;
    },
  } as never);

  const handshake = (socket: ChatSocket) =>
    new Promise<(Error & { data?: unknown }) | undefined>((resolve) =>
      middleware(socket, resolve),
    );

  return { gateway, connectionAuth, chat, handshake };
}

async function connected(
  gateway: ChatGateway,
  handshake: (s: ChatSocket) => Promise<unknown>,
) {
  const socket = fakeSocket('token');
  await handshake(socket);
  gateway.handleConnection(socket);
  socket.emit.mockClear();
  return socket;
}

function emitted(socket: { emit: jest.Mock }, event: string) {
  return socket.emit.mock.calls
    .filter(([name]) => name === event)
    .map(([, payload]) => payload as Record<string, unknown>);
}

describe('ChatGateway', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('handshake', () => {
    it('attaches the server-derived principal and announces the connection', async () => {
      const { gateway, connectionAuth, handshake } = build({});
      const socket = fakeSocket('token');

      await expect(handshake(socket)).resolves.toBeUndefined();
      gateway.handleConnection(socket);

      expect(connectionAuth.authenticate).toHaveBeenCalledWith('token');
      expect(socket.data.principal).toEqual(PRINCIPAL);
      expect(emitted(socket, CHAT_EVENTS.connected)).toEqual([
        { assistantName: 'Training Assistant', maxMessageLength: 2000 },
      ]);
    });

    it('rejects an unauthenticated handshake with a safe code', async () => {
      const { handshake } = build({
        authenticate: jest.fn(() =>
          Promise.reject(new ChatError('UNAUTHORIZED')),
        ),
      });
      const socket = fakeSocket();

      const error = await handshake(socket);

      expect(error?.message).toBe('UNAUTHORIZED');
      expect(error?.data).toEqual({ code: 'UNAUTHORIZED' });
      expect(socket.data.principal).toBeUndefined();
    });

    it('limits concurrent connections per user', async () => {
      const { gateway, handshake } = build({});
      for (let i = 0; i < CHAT_MAX_CONNECTIONS_PER_USER; i += 1) {
        await connected(gateway, handshake);
      }

      const error = await handshake(fakeSocket('token'));
      expect(error?.data).toEqual({ code: 'RATE_LIMITED' });
    });

    it('disconnects a socket that reached connection without a principal', () => {
      const { gateway } = build({});
      const socket = fakeSocket();
      gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('chat:send', () => {
    it('emits typing, then the response, then typing off', async () => {
      const { gateway, chat, handshake } = build({});
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, {
        message: 'Hola',
        clientMessageId: CLIENT_MESSAGE_ID,
        locale: 'es',
      });

      expect(socket.emit.mock.calls.map(([name]) => name)).toEqual([
        CHAT_EVENTS.typing,
        CHAT_EVENTS.response,
        CHAT_EVENTS.typing,
      ]);
      expect(emitted(socket, CHAT_EVENTS.typing)[0]).toMatchObject({
        isTyping: true,
        clientMessageId: CLIENT_MESSAGE_ID,
      });
      expect(emitted(socket, CHAT_EVENTS.response)[0]).toMatchObject({
        conversationId: 'conv-1',
        role: 'assistant',
        clientMessageId: CLIENT_MESSAGE_ID,
      });
      expect(chat.sendMessage).toHaveBeenCalledWith(
        { userId: 'user-1', role: UserRole.CLIENT },
        expect.objectContaining({ message: 'Hola', locale: 'es' }),
        expect.any(AbortSignal),
      );
    });

    it('ignores identity fields from the payload', async () => {
      const { gateway, chat, handshake } = build({});
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, {
        message: 'hola',
        userId: 'attacker',
        role: UserRole.ADMIN,
      });

      expect(chat.sendMessage).not.toHaveBeenCalled();
      expect(emitted(socket, CHAT_EVENTS.error)[0]).toMatchObject({
        code: 'INVALID_MESSAGE',
      });
    });

    it.each([
      [{ message: '' }, 'INVALID_MESSAGE'],
      [{ message: 'x'.repeat(2001) }, 'MESSAGE_TOO_LONG'],
      ['not-an-object', 'INVALID_MESSAGE'],
    ])('rejects invalid payload %#', async (payload, code) => {
      const { gateway, chat, handshake } = build({});
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, payload);

      expect(chat.sendMessage).not.toHaveBeenCalled();
      expect(emitted(socket, CHAT_EVENTS.error)).toEqual([
        expect.objectContaining({ code, retryable: false }),
      ]);
    });

    it('emits AUTH_EXPIRED and disconnects when the token expired mid-connection', async () => {
      const { gateway, chat, handshake } = build({
        assertStillValid: jest.fn(() =>
          Promise.reject(new ChatError('AUTH_EXPIRED')),
        ),
      });
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, {
        message: 'hola',
        clientMessageId: CLIENT_MESSAGE_ID,
      });

      expect(chat.sendMessage).not.toHaveBeenCalled();
      expect(emitted(socket, CHAT_EVENTS.error)[0]).toMatchObject({
        code: 'AUTH_EXPIRED',
        retryable: true,
        clientMessageId: CLIENT_MESSAGE_ID,
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('returns a safe error when the service fails', async () => {
      const { gateway, handshake } = build({
        sendMessage: jest.fn(() =>
          Promise.reject(new ChatError('AI_UNAVAILABLE')),
        ),
      });
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, { message: 'hola' });

      expect(emitted(socket, CHAT_EVENTS.error)).toEqual([
        {
          code: 'AI_UNAVAILABLE',
          message:
            'The assistant cannot reply right now. Please try again shortly.',
          clientMessageId: null,
          retryable: true,
        },
      ]);
    });

    it('never forwards raw internal error text', async () => {
      const { gateway, handshake } = build({
        sendMessage: jest.fn(() =>
          Promise.reject(
            new Error('DEEPSEEK_API_KEY=abc at /srv/app/chat.service.ts'),
          ),
        ),
      });
      const socket = await connected(gateway, handshake);

      await gateway.handleSend(socket, { message: 'hola' });

      const serialized = JSON.stringify(socket.emit.mock.calls);
      expect(serialized).toContain('INTERNAL');
      expect(serialized).not.toContain('DEEPSEEK_API_KEY');
      expect(serialized).not.toContain('/srv/app');
    });

    it('aborts in-flight provider work on disconnect', async () => {
      let seenSignal: AbortSignal | undefined;
      const { gateway, handshake } = build({
        sendMessage: jest.fn(
          (_user: unknown, _input: unknown, signal: AbortSignal) => {
            seenSignal = signal;
            return new Promise((_resolve, reject) =>
              signal.addEventListener('abort', () =>
                reject(new ChatError('AI_UNAVAILABLE')),
              ),
            );
          },
        ),
      });
      const socket = await connected(gateway, handshake);

      const pending = gateway.handleSend(socket, { message: 'hola' });
      for (let tick = 0; tick < 20 && !seenSignal; tick += 1) {
        await Promise.resolve();
      }
      gateway.handleDisconnect(socket);
      await pending;

      expect(seenSignal?.aborted).toBe(true);
      expect(emitted(socket, CHAT_EVENTS.error)).toEqual([]);
    });
  });
});
