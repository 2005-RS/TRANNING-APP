import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import { UserRole } from '../users/enums/user-role.enum';
import { AiProviderName } from './ai/ai-provider-name.enum';
import { AiProviderError } from './ai/ai-provider.error';
import { AiChatInput, AiProvider } from './ai/ai-provider.interface';
import { MockAiProvider } from './ai/mock-ai.provider';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatRateLimiter } from './chat-rate-limiter';
import { ChatError } from './chat.error';
import { ChatService } from './chat.service';
import { PublicChatQuota } from './public-chat-quota';

const CLIENT = { userId: 'user-client-a', role: UserRole.CLIENT };
const VISITOR = { visitorId: '203.0.113.7', sessionKey: 'socket-a' };

function config(
  values: Partial<Record<keyof EnvironmentVariables, unknown>> = {},
) {
  const merged: Partial<Record<keyof EnvironmentVariables, unknown>> = {
    AI_MAX_HISTORY_MESSAGES: 4,
    AI_RATE_LIMIT_PER_MINUTE: 50,
    AI_PUBLIC_RATE_LIMIT_PER_MINUTE: 50,
    AI_PUBLIC_DAILY_MESSAGE_LIMIT: 1000,
    ...values,
  };
  return {
    getOrThrow: (key: keyof EnvironmentVariables) => merged[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

function build(
  provider: AiProvider = new MockAiProvider(),
  values?: Partial<Record<keyof EnvironmentVariables, unknown>>,
) {
  const cfg = config(values);
  const store = new ChatConversationStore(cfg);
  const limiter = new ChatRateLimiter(cfg);
  const quota = new PublicChatQuota(cfg);
  return { service: new ChatService(provider, store, limiter, quota), store };
}

function recordingProvider(
  impl: (input: AiChatInput) => Promise<string> = () =>
    Promise.resolve('reply'),
) {
  const calls: AiChatInput[] = [];
  const provider: AiProvider = {
    name: AiProviderName.Mock,
    generateResponse: async (input) => {
      calls.push(input);
      return { content: await impl(input), model: 'test', truncated: false };
    },
  };
  return { provider, calls };
}

describe('ChatService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns a mock assistant reply with a new conversation id', async () => {
    const { service } = build();

    const reply = await service.sendMessage(CLIENT, {
      message: 'Hola',
      locale: 'es',
    });

    expect(reply).toMatchObject({
      role: 'assistant',
      content: '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
    });
    expect(reply.conversationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(reply.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(reply.createdAt))).toBe(false);
  });

  it('calls the provider with the system prompt, bounded history, and the current turn', async () => {
    const { provider, calls } = recordingProvider((input) =>
      Promise.resolve(`reply ${input.messages.length}`),
    );
    const { service } = build(provider, { AI_MAX_HISTORY_MESSAGES: 4 });

    const first = await service.sendMessage(CLIENT, {
      message: 'uno',
      locale: 'es',
    });
    for (const message of ['dos', 'tres', 'cuatro']) {
      await service.sendMessage(CLIENT, {
        message,
        conversationId: first.conversationId,
        locale: 'es',
      });
    }

    const last = calls[calls.length - 1];
    expect(last.messages[0].role).toBe('system');
    expect(last.messages[0].content).toContain(
      'You are Training Assistant, the virtual assistant for the Training App.',
    );
    expect(last.messages[0].content).toContain('role CLIENT');
    expect(last.messages.slice(1).map((m) => m.content)).toEqual([
      'dos',
      'reply 4',
      'tres',
      'reply 6',
      'cuatro',
    ]);
    expect(last.messages[last.messages.length - 1]).toEqual({
      role: 'user',
      content: 'cuatro',
    });
  });

  it('does not reuse a conversation owned by another user', async () => {
    const { provider, calls } = recordingProvider();
    const { service } = build(provider);

    const mine = await service.sendMessage(CLIENT, {
      message: 'dato privado',
      locale: 'es',
    });
    const other = await service.sendMessage(
      { userId: 'user-client-b', role: UserRole.CLIENT },
      { message: 'hola', conversationId: mine.conversationId, locale: 'es' },
    );

    expect(other.conversationId).not.toBe(mine.conversationId);
    const otherPrompt = calls[1].messages.map((m) => m.content).join('\n');
    expect(otherPrompt).not.toContain('dato privado');
  });

  it('maps provider failures to a safe AI_UNAVAILABLE error and keeps history clean', async () => {
    let fail = true;
    const { provider, calls } = recordingProvider(() =>
      fail
        ? Promise.reject(new AiProviderError('timeout'))
        : Promise.resolve('ok'),
    );
    const { service } = build(provider);

    const error = await service
      .sendMessage(CLIENT, { message: 'falla', locale: 'es' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).code).toBe('AI_UNAVAILABLE');

    fail = false;
    const reply = await service.sendMessage(CLIENT, {
      message: 'otra vez',
      locale: 'es',
    });
    await service.sendMessage(CLIENT, {
      message: 'sigue',
      conversationId: reply.conversationId,
      locale: 'es',
    });
    const history = calls[2].messages.map((m) => m.content);
    expect(history).not.toContain('falla');
  });

  it('maps unexpected errors to INTERNAL without leaking details', async () => {
    const { provider } = recordingProvider(() =>
      Promise.reject(new Error('postgres://secret@db')),
    );
    const { service } = build(provider);

    const error = (await service
      .sendMessage(CLIENT, { message: 'x', locale: 'es' })
      .catch((e: unknown) => e)) as ChatError;

    expect(error.code).toBe('INTERNAL');
    expect(error.message).not.toContain('postgres');
  });

  it('rejects a second concurrent message from the same user as BUSY', async () => {
    let release: (value: string) => void = () => undefined;
    const { provider } = recordingProvider(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { service } = build(provider);

    const first = service.sendMessage(CLIENT, { message: 'a', locale: 'es' });
    await expect(
      service.sendMessage(CLIENT, { message: 'b', locale: 'es' }),
    ).rejects.toMatchObject({ code: 'BUSY' });

    release('done');
    await expect(first).resolves.toMatchObject({ content: 'done' });
  });

  it('rate limits per user per minute', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-24T12:00:00Z') });
    const { service } = build(new MockAiProvider(), {
      AI_RATE_LIMIT_PER_MINUTE: 2,
    });

    await service.sendMessage(CLIENT, { message: 'a', locale: 'es' });
    await service.sendMessage(CLIENT, { message: 'b', locale: 'es' });
    const limited = (await service
      .sendMessage(CLIENT, { message: 'c', locale: 'es' })
      .catch((e: unknown) => e)) as ChatError;

    expect(limited.code).toBe('RATE_LIMITED');
    expect(limited.retryAfterMs).toBeGreaterThan(0);
    await expect(
      service.sendMessage(
        { userId: 'someone-else', role: UserRole.TRAINER },
        { message: 'a', locale: 'es' },
      ),
    ).resolves.toBeDefined();

    jest.setSystemTime(new Date('2026-09-24T12:01:01Z'));
    await expect(
      service.sendMessage(CLIENT, { message: 'd', locale: 'es' }),
    ).resolves.toBeDefined();
  });
});

describe('ChatService (public visitors)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses the public system prompt without any role context', async () => {
    const { provider, calls } = recordingProvider();
    const { service } = build(provider);

    await service.sendMessage(VISITOR, { message: 'hola', locale: 'es' });

    const system = calls[0].messages[0].content;
    expect(system).toContain('PUBLIC_ASSISTANT_CONTEXT');
    expect(system).toContain('anonymous website visitor who is NOT signed in');
    expect(system).not.toContain('signed in with the role');
    expect(system).toContain('Pricing published: false');
    expect(system).toContain('Configured public contact channel: none');
    expect(system).toContain(
      'When a price, specific commercial plan, discount, payment method, contact detail, or trainer availability is not in the authoritative knowledge, NEVER guess.',
    );
  });

  it('provides recent public conversation context to the provider', async () => {
    const { provider, calls } = recordingProvider();
    const { service } = build(provider);

    const first = await service.sendMessage(VISITOR, {
      message: '¿Cómo contrato la app?',
      locale: 'es',
    });
    await service.sendMessage(VISITOR, {
      message: '¿Y dónde solicito los planes?',
      conversationId: first.conversationId,
      locale: 'es',
    });

    expect(
      calls[1].messages.slice(1).map((message) => message.content),
    ).toEqual([
      '¿Cómo contrato la app?',
      'reply',
      '¿Y dónde solicito los planes?',
    ]);
  });

  it('keeps visitor conversations per socket even when they share an IP', async () => {
    const { provider, calls } = recordingProvider();
    const { service } = build(provider);

    const first = await service.sendMessage(VISITOR, {
      message: 'mi pregunta',
      locale: 'es',
    });
    const other = await service.sendMessage(
      { visitorId: VISITOR.visitorId, sessionKey: 'socket-b' },
      { message: 'hola', conversationId: first.conversationId, locale: 'es' },
    );

    expect(other.conversationId).not.toBe(first.conversationId);
    expect(calls[1].messages.map((m) => m.content)).not.toContain(
      'mi pregunta',
    );
  });

  it('never lets a visitor reuse a member conversation id', async () => {
    const { provider, calls } = recordingProvider();
    const { service } = build(provider);

    const member = await service.sendMessage(CLIENT, {
      message: 'dato privado',
      locale: 'es',
    });
    await service.sendMessage(VISITOR, {
      message: 'hola',
      conversationId: member.conversationId,
      locale: 'es',
    });

    expect(calls[1].messages.map((m) => m.content)).not.toContain(
      'dato privado',
    );
  });

  it('rate limits visitors per IP across sockets with the public limit', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-24T12:00:00Z') });
    const { service } = build(new MockAiProvider(), {
      AI_PUBLIC_RATE_LIMIT_PER_MINUTE: 2,
      AI_RATE_LIMIT_PER_MINUTE: 50,
    });

    await service.sendMessage(VISITOR, { message: 'a', locale: 'es' });
    await service.sendMessage(
      { ...VISITOR, sessionKey: 'socket-b' },
      { message: 'b', locale: 'es' },
    );
    await expect(
      service.sendMessage(VISITOR, { message: 'c', locale: 'es' }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(
      service.sendMessage(CLIENT, { message: 'a', locale: 'es' }),
    ).resolves.toBeDefined();
  });

  it('stops anonymous replies once the global daily quota is used up', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-24T12:00:00Z') });
    const { provider, calls } = recordingProvider();
    const { service } = build(provider, { AI_PUBLIC_DAILY_MESSAGE_LIMIT: 2 });

    await service.sendMessage(VISITOR, { message: 'a', locale: 'es' });
    await service.sendMessage(
      { visitorId: '198.51.100.1', sessionKey: 's2' },
      { message: 'b', locale: 'es' },
    );
    await expect(
      service.sendMessage(
        { visitorId: '198.51.100.2', sessionKey: 's3' },
        { message: 'c', locale: 'es' },
      ),
    ).rejects.toMatchObject({ code: 'QUOTA_EXHAUSTED' });
    expect(calls).toHaveLength(2);
    await expect(
      service.sendMessage(CLIENT, { message: 'miembro', locale: 'es' }),
    ).resolves.toBeDefined();

    jest.setSystemTime(new Date('2026-09-25T00:00:01Z'));
    await expect(
      service.sendMessage(VISITOR, { message: 'd', locale: 'es' }),
    ).resolves.toBeDefined();
  });
});

describe('ChatConversationStore', () => {
  afterEach(() => jest.useRealTimers());

  it('expires idle conversations', () => {
    jest.useFakeTimers({ now: new Date('2026-09-24T12:00:00Z') });
    const store = new ChatConversationStore(config());
    const conversation = store.resolve('u1');
    store.appendExchange(conversation, 'hola', 'hola!');

    jest.setSystemTime(new Date('2026-09-24T14:00:01Z'));
    const next = store.resolve('u1', conversation.id);

    expect(next.id).not.toBe(conversation.id);
    expect(store.recentTurns(next)).toEqual([]);
  });

  it('caps conversations per user', () => {
    const store = new ChatConversationStore(config());
    const first = store.resolve('u1');
    for (let i = 0; i < 5; i += 1) {
      store.resolve('u1');
    }

    expect(store.resolve('u1', first.id).id).not.toBe(first.id);
    expect(store.size()).toBeLessThanOrEqual(5);
  });
});
