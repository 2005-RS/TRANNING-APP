import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

const PASSWORD = 'correct horse battery';
const ALLOWED_ORIGIN = 'http://localhost:5173';
const CLIENT_MESSAGE_ID = '0b8f6a52-6a0e-4c52-9d3c-1f2e3a4b5c6d';

type ConnectResult =
  | { ok: true; socket: Socket; connected: unknown }
  | { ok: false; message: string; data: unknown };

describe('Training Assistant chat gateway (e2e, AI_PROVIDER=mock)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let http: App;
  let baseUrl: string;
  let dataSource: DataSource;
  let users: Repository<User>;
  let hasher: PasswordHasherService;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';
    process.env.AI_PROVIDER = 'mock';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');

    http = app.getHttpServer() as App;
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    hasher = app.get(PasswordHasherService);
  });

  beforeEach(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
    delete process.env.AI_PROVIDER;
  });

  async function login(role: UserRole): Promise<{
    accessToken: string;
    cookie: string;
  }> {
    const email = `${role.toLowerCase()}-${Date.now()}@chat.test`;
    await users.save(
      users.create({
        email,
        passwordHash: await hasher.hash(PASSWORD),
        firstName: 'Chat',
        lastName: 'Tester',
        role,
        status: UserStatus.ACTIVE,
      }),
    );
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const setCookie = response.headers['set-cookie'] as unknown as string[];
    return {
      accessToken: response.body.accessToken as string,
      cookie: setCookie[0].split(';')[0],
    };
  }

  function connect(
    auth: Record<string, unknown>,
    origin = ALLOWED_ORIGIN,
    namespace = '/chat',
  ): Promise<ConnectResult> {
    const socket = io(`${baseUrl}${namespace}`, {
      auth,
      transports: ['websocket'],
      extraHeaders: { Origin: origin },
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return new Promise((resolve) => {
      socket.once('chat:connected', (payload: unknown) =>
        resolve({ ok: true, socket, connected: payload }),
      );
      socket.once('connect_error', (error: Error & { data?: unknown }) =>
        resolve({ ok: false, message: error.message, data: error.data }),
      );
    });
  }

  function next<T>(socket: Socket, event: string): Promise<T> {
    return new Promise((resolve) => socket.once(event, resolve));
  }

  it('rejects a handshake without a token', async () => {
    const result = await connect({});
    expect(result).toMatchObject({
      ok: false,
      message: 'UNAUTHORIZED',
      data: { code: 'UNAUTHORIZED' },
    });
  });

  it('rejects a forged token', async () => {
    const result = await connect({ token: 'eyJhbGciOiJIUzI1NiJ9.e30.forged' });
    expect(result).toMatchObject({ ok: false, message: 'UNAUTHORIZED' });
  });

  it('rejects a browser origin outside CORS_ORIGIN', async () => {
    const { accessToken } = await login(UserRole.CLIENT);
    const result = await connect(
      { token: accessToken },
      'https://evil.example',
    );
    expect(result.ok).toBe(false);
  });

  it('round-trips React → WebSocket → ChatService → MockAiProvider → reply', async () => {
    const { accessToken } = await login(UserRole.CLIENT);
    const result = await connect({ token: accessToken });
    if (!result.ok) {
      throw new Error(`connect failed: ${result.message}`);
    }
    expect(result.connected).toEqual({
      assistantName: 'Training Assistant',
      maxMessageLength: 2000,
    });

    const typing = next<Record<string, unknown>>(result.socket, 'chat:typing');
    const response = next<Record<string, unknown>>(
      result.socket,
      'chat:response',
    );
    result.socket.emit('chat:send', {
      message: 'Hola',
      clientMessageId: CLIENT_MESSAGE_ID,
      locale: 'es',
    });

    await expect(typing).resolves.toMatchObject({
      isTyping: true,
      clientMessageId: CLIENT_MESSAGE_ID,
    });
    const reply = await response;
    expect(reply).toMatchObject({
      role: 'assistant',
      content: '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
      clientMessageId: CLIENT_MESSAGE_ID,
    });

    const followUp = next<Record<string, unknown>>(
      result.socket,
      'chat:response',
    );
    result.socket.emit('chat:send', {
      message: 'entrenamiento',
      conversationId: reply.conversationId,
      locale: 'es',
    });
    await expect(followUp).resolves.toMatchObject({
      conversationId: reply.conversationId,
      content:
        'Puedo ayudarte a entender cómo funciona tu entrenamiento dentro de la plataforma.',
    });
  });

  it.each([UserRole.TRAINER, UserRole.ADMIN])(
    'serves the %s role',
    async (role) => {
      const { accessToken } = await login(role);
      const result = await connect({ token: accessToken });
      expect(result.ok).toBe(true);
    },
  );

  it('returns a safe validation error for an empty message', async () => {
    const { accessToken } = await login(UserRole.CLIENT);
    const result = await connect({ token: accessToken });
    if (!result.ok) {
      throw new Error('connect failed');
    }

    const error = next<Record<string, unknown>>(result.socket, 'chat:error');
    result.socket.emit('chat:send', { message: '   ' });

    await expect(error).resolves.toEqual({
      code: 'INVALID_MESSAGE',
      message: 'The message could not be sent.',
      clientMessageId: null,
      retryable: false,
    });
  });

  it('stops serving a socket whose session was logged out', async () => {
    const { accessToken, cookie } = await login(UserRole.CLIENT);
    const result = await connect({ token: accessToken });
    if (!result.ok) {
      throw new Error('connect failed');
    }

    await request(http)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    const error = next<Record<string, unknown>>(result.socket, 'chat:error');
    const disconnected = next<string>(result.socket, 'disconnect');
    result.socket.emit('chat:send', { message: 'Hola' });

    await expect(error).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(disconnected).resolves.toBe('io server disconnect');
  });

  describe('public namespace (anonymous visitors)', () => {
    it('serves an anonymous visitor without any token', async () => {
      const result = await connect({}, ALLOWED_ORIGIN, '/public-chat');
      if (!result.ok) {
        throw new Error(`connect failed: ${result.message}`);
      }
      expect(result.connected).toEqual({
        assistantName: 'Training Assistant',
        maxMessageLength: 500,
      });

      const response = next<Record<string, unknown>>(
        result.socket,
        'chat:response',
      );
      result.socket.emit('chat:send', {
        message: '¿Cómo obtengo una cuenta?',
        clientMessageId: CLIENT_MESSAGE_ID,
        locale: 'es',
      });

      await expect(response).resolves.toMatchObject({
        role: 'assistant',
        clientMessageId: CLIENT_MESSAGE_ID,
        content: expect.stringContaining('registro público') as unknown,
      });
    });

    it('still enforces the CORS origin allowlist', async () => {
      const result = await connect({}, 'https://evil.example', '/public-chat');
      expect(result.ok).toBe(false);
    });

    it('rejects messages above the public length limit', async () => {
      const result = await connect({}, ALLOWED_ORIGIN, '/public-chat');
      if (!result.ok) {
        throw new Error('connect failed');
      }

      const error = next<Record<string, unknown>>(result.socket, 'chat:error');
      result.socket.emit('chat:send', { message: 'x'.repeat(501) });

      await expect(error).resolves.toMatchObject({
        code: 'MESSAGE_TOO_LONG',
        retryable: false,
      });
    });

    it('does not let an anonymous socket reach the member namespace', async () => {
      const result = await connect({}, ALLOWED_ORIGIN, '/chat');
      expect(result).toMatchObject({ ok: false, message: 'UNAUTHORIZED' });
    });
  });
});
