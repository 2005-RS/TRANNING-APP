import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import {
  MAIL_TRANSPORT,
  MailMessage,
  MailTransport,
} from '../src/mail/mail-transport.interface';
import { PasswordResetToken } from '../src/modules/auth/entities/password-reset-token.entity';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

const COOKIE = 'refresh_session';
const OLD_PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a brand new passphrase';

class CapturingMailTransport implements MailTransport {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

function readCookie(response: request.Response): string | null {
  const header = response.headers['set-cookie'];
  const parts = Array.isArray(header) ? header : header ? [header] : [];
  const match = parts.find((item) => item.startsWith(`${COOKIE}=`));
  return match ? (match.split(';')[0] ?? null) : null;
}

function tokenFrom(message: MailMessage | undefined): string {
  const match = message?.text.match(/\/reset-password#token=(\S+)/);
  if (!match?.[1]) {
    throw new Error('No reset link in the captured email');
  }
  return match[1];
}

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let tokens: Repository<PasswordResetToken>;
  let hasher: PasswordHasherService;
  const mail = new CapturingMailTransport();

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(mail)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    tokens = dataSource.getRepository(PasswordResetToken);
    hasher = app.get(PasswordHasherService);
  });

  beforeEach(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);
    mail.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  async function createClient(
    status: UserStatus = UserStatus.ACTIVE,
  ): Promise<User> {
    return users.save(
      users.create({
        email: 'client@example.com',
        passwordHash: await hasher.hash(OLD_PASSWORD),
        firstName: 'Cleo',
        lastName: 'Client',
        role: UserRole.CLIENT,
        status,
      }),
    );
  }

  async function requestLink(email = 'client@example.com'): Promise<string> {
    await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(202);
    return tokenFrom(mail.sent.at(-1));
  }

  function login(password: string) {
    return request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'client@example.com', password });
  }

  it('resets the password once and revokes every existing session', async () => {
    await createClient();
    const session = readCookie(await login(OLD_PASSWORD).expect(200));

    const token = await requestLink('Client@Example.com');
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]?.to).toBe('client@example.com');

    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: NEW_PASSWORD })
      .expect(204);

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', session ?? '')
      .expect(401);
    await login(OLD_PASSWORD).expect(401);
    await login(NEW_PASSWORD).expect(200);

    const reused = await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'yet another passphrase' })
      .expect(400);
    expect(reused.body.message).toBe(
      'This reset link is invalid or has expired',
    );
  });

  it('answers 202 for unknown and disabled accounts without sending mail', async () => {
    await createClient(UserStatus.DISABLED);

    const unknown = await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' })
      .expect(202);
    const disabled = await request(http)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'client@example.com' })
      .expect(202);

    expect(unknown.body).toEqual(disabled.body);
    expect(mail.sent).toHaveLength(0);
    expect(await tokens.count()).toBe(0);
  });

  it('rejects an expired token', async () => {
    await createClient();
    const token = await requestLink();
    await tokens
      .createQueryBuilder()
      .update()
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .execute();

    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: NEW_PASSWORD })
      .expect(400);
    await login(OLD_PASSWORD).expect(200);
  });

  it('invalidates the other outstanding links once one is used', async () => {
    await createClient();
    const first = await requestLink();
    const second = await requestLink();

    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token: second, password: NEW_PASSWORD })
      .expect(204);
    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token: first, password: 'yet another passphrase' })
      .expect(400);
  });

  it('rejects a tampered secret and malformed tokens', async () => {
    await createClient();
    const token = await requestLink();
    const [id] = token.split('.');

    for (const candidate of [
      `${id}.${'x'.repeat(43)}`,
      'not-a-token',
      `${id}.short`,
    ]) {
      await request(http)
        .post('/api/v1/auth/reset-password')
        .send({ token: candidate, password: NEW_PASSWORD })
        .expect(400);
    }
    await login(OLD_PASSWORD).expect(200);
  });

  it('enforces the password policy and keeps the token usable', async () => {
    await createClient();
    const token = await requestLink();

    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'short' })
      .expect(400);
    await request(http)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: NEW_PASSWORD })
      .expect(204);
  });

  it('never stores the raw token', async () => {
    await createClient();
    const token = await requestLink();
    const [, secret] = token.split('.');

    const stored = await tokens
      .createQueryBuilder('token')
      .addSelect('token.tokenDigest')
      .getOneOrFail();
    expect(stored.tokenDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenDigest).not.toContain(secret);
  });
});
