import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { AuthSession } from '../src/modules/auth/entities/auth-session.entity';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';
import { RoleProbeController } from './helpers/role-probe.controller';

const COOKIE = 'refresh_session';
const PASSWORD = 'correct horse battery';

function readCookie(response: request.Response, name: string): string | null {
  const header = response.headers['set-cookie'];
  const parts = Array.isArray(header) ? header : header ? [header] : [];
  const match = parts.find((item) => item.startsWith(`${name}=`));
  if (!match) {
    return null;
  }
  return match.split(';')[0]?.slice(name.length + 1) ?? null;
}

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let sessions: Repository<AuthSession>;
  let hasher: PasswordHasherService;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [RoleProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    sessions = dataSource.getRepository(AuthSession);
    hasher = app.get(PasswordHasherService);
  });

  beforeEach(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  async function createUser(
    overrides: Partial<User> & { email: string; role: UserRole },
  ): Promise<User> {
    const user = users.create({
      email: overrides.email,
      passwordHash: await hasher.hash(PASSWORD),
      firstName: overrides.firstName ?? 'Ada',
      lastName: overrides.lastName ?? 'Admin',
      role: overrides.role,
      status: overrides.status ?? UserStatus.ACTIVE,
    });
    return users.save(user);
  }

  it('logs in, sets an HttpOnly refresh cookie, and hides password hashes', async () => {
    const user = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });

    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'Admin@Example.com', password: PASSWORD })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.user).toEqual(
      expect.objectContaining({
        id: user.id,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('refreshTokenDigest');
    expect(response.body.refresh).toBeUndefined();

    const cookie = response.headers['set-cookie'];
    const raw = Array.isArray(cookie) ? cookie.join(';') : String(cookie);
    expect(raw).toContain('HttpOnly');
    expect(readCookie(response, COOKIE)).toContain('.');
  });

  it('uses the same generic 401 for unknown emails and wrong passwords', async () => {
    await createUser({ email: 'admin@example.com', role: UserRole.ADMIN });

    const unknown = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: PASSWORD })
      .expect(401);

    const wrong = await request(http)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'definitely-wrong-password',
      })
      .expect(401);

    expect(unknown.body.message).toBe(wrong.body.message);
    expect(unknown.body.statusCode).toBe(401);
  });

  it('denies disabled accounts', async () => {
    await createUser({
      email: 'disabled@example.com',
      role: UserRole.CLIENT,
      status: UserStatus.DISABLED,
    });

    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'disabled@example.com', password: PASSWORD })
      .expect(401);
  });

  it('rejects invalid login payloads', async () => {
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: PASSWORD })
      .expect(400);
  });

  it('refreshes and rejects the previous refresh credential', async () => {
    await createUser({ email: 'admin@example.com', role: UserRole.ADMIN });
    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);

    const firstCookie = readCookie(login, COOKIE);
    expect(firstCookie).toBeTruthy();

    const refresh = await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${firstCookie}`)
      .expect(200);

    const secondCookie = readCookie(refresh, COOKIE);
    expect(secondCookie).toBeTruthy();
    expect(secondCookie).not.toBe(firstCookie);
    expect(refresh.body.accessToken).toEqual(expect.any(String));

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${firstCookie}`)
      .expect(401);
  });

  it('rejects expired, revoked, disabled, malformed, and missing refresh sessions', async () => {
    const user = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    const cookie = readCookie(login, COOKIE) as string;

    await sessions.update(
      { userId: user.id },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${cookie}`)
      .expect(401);

    const loginTwo = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    const cookieTwo = readCookie(loginTwo, COOKIE) as string;
    await request(http)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${COOKIE}=${cookieTwo}`)
      .expect(204);
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${cookieTwo}`)
      .expect(401);

    const loginThree = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    const cookieThree = readCookie(loginThree, COOKIE) as string;
    await users.update({ id: user.id }, { status: UserStatus.DISABLED });
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${cookieThree}`)
      .expect(401);

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=not-valid`)
      .expect(401);

    await request(http).post('/api/v1/auth/refresh').expect(401);
  });

  it('logs out idempotently and logout-all does not affect another user', async () => {
    const admin = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    const trainer = await createUser({
      email: 'trainer@example.com',
      role: UserRole.TRAINER,
    });

    const adminLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: PASSWORD })
      .expect(200);
    const trainerLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: trainer.email, password: PASSWORD })
      .expect(200);

    const adminCookie = readCookie(adminLogin, COOKIE) as string;
    const trainerCookie = readCookie(trainerLogin, COOKIE) as string;

    await request(http)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${COOKIE}=${adminCookie}`)
      .expect(204);
    await request(http)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${COOKIE}=${adminCookie}`)
      .expect(204);

    const adminLoginTwo = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: PASSWORD })
      .expect(200);

    await request(http)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${adminLoginTwo.body.accessToken}`)
      .expect(204);

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${readCookie(adminLoginTwo, COOKIE)}`)
      .expect(401);

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${trainerCookie}`)
      .expect(200);
  });

  it('enforces authentication and roles', async () => {
    await request(http).get('/api/v1/health').expect(200);
    await request(http).get('/api/v1/auth/me').expect(401);
    await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
    await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Token abc')
      .expect(401);

    const user = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    const me = await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body.email).toBe('admin@example.com');
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');

    await request(http)
      .get('/api/v1/role-probe/trainer')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);

    const trainer = await createUser({
      email: 'trainer@example.com',
      role: UserRole.TRAINER,
    });
    const trainerLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: trainer.email, password: PASSWORD })
      .expect(200);

    await request(http)
      .get('/api/v1/role-probe/trainer')
      .set('Authorization', `Bearer ${trainerLogin.body.accessToken}`)
      .expect(200);
  });

  it('does not grant access from a session id without the secret', async () => {
    await createUser({ email: 'admin@example.com', role: UserRole.ADMIN });
    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    const cookie = readCookie(login, COOKIE) as string;
    const sessionId = cookie.split('.')[0];

    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${sessionId}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`)
      .expect(401);
  });
});
