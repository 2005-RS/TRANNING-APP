import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import {
  CHAT_EVENTS,
  PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP,
} from './chat.constants';
import { ChatError } from './chat.error';
import { ChatService } from './chat.service';
import { PublicChatGateway } from './public-chat.gateway';
import { ChatSocket } from './types/chat.types';

type Middleware = (
  socket: ChatSocket,
  next: (error?: Error & { data?: unknown }) => void,
) => void;

let socketCounter = 0;

function fakeSocket(
  address = '203.0.113.7',
  headers: Record<string, string> = {},
  auth: Record<string, unknown> = {},
) {
  socketCounter += 1;
  const socket = {
    id: `socket-${socketCounter}`,
    data: {},
    handshake: { address, headers, auth },
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return socket as unknown as ChatSocket & {
    emit: jest.Mock;
    disconnect: jest.Mock;
  };
}

function build(
  options: {
    enabled?: boolean;
    trustProxy?: boolean;
    sendMessage?: jest.Mock;
  } = {},
) {
  const values: Partial<Record<keyof EnvironmentVariables, unknown>> = {
    AI_PUBLIC_CHAT_ENABLED: options.enabled ?? true,
    TRUST_PROXY: options.trustProxy ?? false,
  };
  const config = {
    getOrThrow: (key: keyof EnvironmentVariables) => values[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const chat = {
    sendMessage:
      options.sendMessage ??
      jest.fn(() =>
        Promise.resolve({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          role: 'assistant',
          content: 'hola',
          createdAt: '2026-09-24T12:00:00.000Z',
        }),
      ),
  };
  const gateway = new PublicChatGateway(chat as unknown as ChatService, config);
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
  return { gateway, chat, handshake };
}

async function connected(
  gateway: PublicChatGateway,
  handshake: (s: ChatSocket) => Promise<unknown>,
  socket = fakeSocket(),
) {
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

describe('PublicChatGateway', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts anonymous visitors and announces the public message limit', async () => {
    const { gateway, handshake } = build();
    const socket = fakeSocket();

    await expect(handshake(socket)).resolves.toBeUndefined();
    gateway.handleConnection(socket);

    expect(socket.data.visitorId).toBe('203.0.113.7');
    expect(socket.data.principal).toBeUndefined();
    expect(emitted(socket, CHAT_EVENTS.connected)).toEqual([
      { assistantName: 'Training Assistant', maxMessageLength: 500 },
    ]);
  });

  it('ignores any token in the handshake', async () => {
    const { gateway, chat, handshake } = build();
    const socket = await connected(
      gateway,
      handshake,
      fakeSocket('203.0.113.7', {}, { token: 'a.b.c' }),
    );

    await gateway.handleSend(socket, { message: 'hola' });

    expect(chat.sendMessage).toHaveBeenCalledWith(
      { visitorId: '203.0.113.7', sessionKey: socket.id },
      expect.objectContaining({ message: 'hola' }),
      expect.any(AbortSignal),
    );
  });

  it('refuses connections when the public assistant is disabled', async () => {
    const { handshake } = build({ enabled: false });
    const error = await handshake(fakeSocket());
    expect(error?.data).toEqual({ code: 'AI_UNAVAILABLE' });
  });

  it('limits concurrent connections per IP', async () => {
    const { gateway, handshake } = build();
    for (let i = 0; i < PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP; i += 1) {
      await connected(gateway, handshake);
    }

    expect((await handshake(fakeSocket()))?.data).toEqual({
      code: 'RATE_LIMITED',
    });
    await expect(
      handshake(fakeSocket('198.51.100.9')),
    ).resolves.toBeUndefined();
  });

  it('frees a connection slot on disconnect', async () => {
    const { gateway, handshake } = build();
    const sockets = [];
    for (let i = 0; i < PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP; i += 1) {
      sockets.push(await connected(gateway, handshake));
    }
    gateway.handleDisconnect(sockets[0]);

    await expect(handshake(fakeSocket())).resolves.toBeUndefined();
  });

  it('does not trust X-Forwarded-For unless TRUST_PROXY is enabled', async () => {
    const spoofed = { 'x-forwarded-for': '1.2.3.4' };
    const untrusted = build();
    const a = fakeSocket('10.0.0.5', spoofed);
    await untrusted.handshake(a);
    expect(a.data.visitorId).toBe('10.0.0.5');

    const trusted = build({ trustProxy: true });
    const b = fakeSocket('10.0.0.5', { 'x-forwarded-for': '9.9.9.9, 1.2.3.4' });
    await trusted.handshake(b);
    expect(b.data.visitorId).toBe('1.2.3.4');
  });

  it('rejects messages longer than the public limit before calling the service', async () => {
    const { gateway, chat, handshake } = build();
    const socket = await connected(gateway, handshake);

    await gateway.handleSend(socket, { message: 'x'.repeat(501) });

    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(emitted(socket, CHAT_EVENTS.error)[0]).toMatchObject({
      code: 'MESSAGE_TOO_LONG',
      retryable: false,
    });
  });

  it('rejects identity fields in the payload', async () => {
    const { gateway, chat, handshake } = build();
    const socket = await connected(gateway, handshake);

    await gateway.handleSend(socket, { message: 'hola', role: 'ADMIN' });

    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(emitted(socket, CHAT_EVENTS.error)[0]).toMatchObject({
      code: 'INVALID_MESSAGE',
    });
  });

  it('emits typing, response, typing off for a valid message', async () => {
    const { gateway, handshake } = build();
    const socket = await connected(gateway, handshake);

    await gateway.handleSend(socket, { message: '¿Qué es Training?' });

    expect(socket.emit.mock.calls.map(([name]) => name)).toEqual([
      CHAT_EVENTS.typing,
      CHAT_EVENTS.response,
      CHAT_EVENTS.typing,
    ]);
  });

  it('surfaces the daily quota as a safe error', async () => {
    const { gateway, handshake } = build({
      sendMessage: jest.fn(() =>
        Promise.reject(new ChatError('QUOTA_EXHAUSTED')),
      ),
    });
    const socket = await connected(gateway, handshake);

    await gateway.handleSend(socket, { message: 'hola' });

    expect(emitted(socket, CHAT_EVENTS.error)).toEqual([
      expect.objectContaining({ code: 'QUOTA_EXHAUSTED', retryable: false }),
    ]);
  });
});
