import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { isPostgresUniqueViolation } from '../src/database/postgres-errors';
import { AuthSession } from '../src/modules/auth/entities/auth-session.entity';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ClientProfile } from '../src/modules/clients/entities/client-profile.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { UsersService } from '../src/modules/users/users.service';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

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

function isPostgresForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    error.driverError.code === '23503'
  );
}

function assertNoSecrets(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toContain('passwordHash');
  expect(raw).not.toContain('refreshTokenDigest');
  expect(raw).not.toMatch(/"password"\s*:/);
  expect(raw).not.toContain('trainerId');
}

describe('Clients (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let sessions: Repository<AuthSession>;
  let profiles: Repository<ClientProfile>;
  let hasher: PasswordHasherService;
  let usersService: UsersService;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    sessions = dataSource.getRepository(AuthSession);
    profiles = dataSource.getRepository(ClientProfile);
    hasher = app.get(PasswordHasherService);
    usersService = app.get(UsersService);
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

  async function login(
    email: string,
  ): Promise<{ accessToken: string; cookie: string | null }> {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return {
      accessToken: response.body.accessToken as string,
      cookie: readCookie(response, COOKIE),
    };
  }

  async function authHeader(email: string): Promise<string> {
    const { accessToken } = await login(email);
    return `Bearer ${accessToken}`;
  }

  async function createAdmin(): Promise<{ user: User; authorization: string }> {
    const user = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    return { user, authorization: await authHeader(user.email) };
  }

  function clientPayload(overrides: Record<string, unknown> = {}) {
    return {
      email: 'client@example.com',
      password: PASSWORD,
      firstName: 'Cara',
      lastName: 'Client',
      phone: '+1 555 0140',
      dateOfBirth: '1994-06-15',
      primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
      goalNotes: 'Improve upper-body strength while gaining lean mass.',
      experienceLevel: ClientExperienceLevel.BEGINNER,
      ...overrides,
    };
  }

  async function provisionClient(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(http)
      .post('/api/v1/clients')
      .set('Authorization', authorization)
      .send(clientPayload(overrides))
      .expect(201);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body.accessToken).toBeUndefined();
    assertNoSecrets(response.body);
    return response.body as {
      id: string;
      user: { id: string; email: string; role: string; status: string };
      phone: string | null;
      dateOfBirth: string | null;
      primaryGoal: string;
      experienceLevel: string;
    };
  }

  describe('POST /api/v1/clients', () => {
    it('lets ADMIN create User + ClientProfile atomically without logging the client in', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionClient(authorization);

      expect(created.user).toEqual(
        expect.objectContaining({
          email: 'client@example.com',
          firstName: 'Cara',
          lastName: 'Client',
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
        }),
      );
      expect(created.dateOfBirth).toBe('1994-06-15');
      expect(created.primaryGoal).toBe(ClientPrimaryGoal.MUSCLE_GAIN);
      expect(created.experienceLevel).toBe(ClientExperienceLevel.BEGINNER);
      expect(await profiles.count()).toBe(1);
      expect(await users.count({ where: { role: UserRole.CLIENT } })).toBe(1);
    });

    it('rejects role injection, trainerId, and unauthorized creators', async () => {
      const { authorization } = await createAdmin();

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ role: UserRole.ADMIN }))
        .expect(400);

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ trainerId: randomUUID() }))
        .expect(400);

      await request(http)
        .post('/api/v1/clients')
        .send(clientPayload({ email: 'anon@example.com' }))
        .expect(401);

      const trainer = await createUser({
        email: 'trainer@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', await authHeader(trainer.email))
        .send(clientPayload({ email: 'blocked-trainer@example.com' }))
        .expect(403);

      const client = await createUser({
        email: 'existing-client@example.com',
        role: UserRole.CLIENT,
      });
      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', await authHeader(client.email))
        .send(clientPayload({ email: 'blocked-client@example.com' }))
        .expect(403);
    });

    it('rejects invalid and future dates of birth', async () => {
      const { authorization } = await createAdmin();

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ dateOfBirth: '2024-02-30' }))
        .expect(400);

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ dateOfBirth: '2026-01-01T00:00:00Z' }))
        .expect(400);

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ dateOfBirth: '2099-01-01' }))
        .expect(400);
    });

    it('returns 409 when the email already belongs to any user', async () => {
      const { authorization, user: admin } = await createAdmin();

      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ email: admin.email }))
        .expect(409);

      await createUser({
        email: 'trainer-taken@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ email: 'Trainer-Taken@Example.com' }))
        .expect(409);

      await provisionClient(authorization, { email: 'Client@Example.com' });
      const duplicate = await request(http)
        .post('/api/v1/clients')
        .set('Authorization', authorization)
        .send(clientPayload({ email: 'client@example.com' }))
        .expect(409);

      expect(duplicate.body.message).toBe('Email already in use');
      expect(
        await users.find({ where: { email: 'client@example.com' } }),
      ).toHaveLength(1);
    });

    it('rolls back the CLIENT user when profile persistence fails', async () => {
      const { authorization } = await createAdmin();
      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(ClientProfile);
            jest
              .spyOn(repo, 'save')
              .mockRejectedValueOnce(new Error('forced profile failure'));
            return (
              runInTransaction as (m: typeof manager) => Promise<unknown>
            )(manager);
          });
        });

      try {
        await request(http)
          .post('/api/v1/clients')
          .set('Authorization', authorization)
          .send(clientPayload({ email: 'orphan-check@example.com' }))
          .expect(500);

        expect(
          await users.findOne({ where: { email: 'orphan-check@example.com' } }),
        ).toBeNull();
        expect(await users.count({ where: { role: UserRole.CLIENT } })).toBe(0);
        expect(await profiles.count()).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('GET /api/v1/clients', () => {
    it('paginates, searches, filters, sorts, and hides secrets', async () => {
      const { authorization } = await createAdmin();
      await provisionClient(authorization, {
        email: 'alpha@example.com',
        firstName: 'Alpha',
        lastName: 'Nadir',
        primaryGoal: ClientPrimaryGoal.FAT_LOSS,
        experienceLevel: ClientExperienceLevel.BEGINNER,
      });
      await provisionClient(authorization, {
        email: 'beta@example.com',
        firstName: 'Beta',
        lastName: 'Searchable',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.INTERMEDIATE,
      });
      const disabled = await provisionClient(authorization, {
        email: 'gamma@example.com',
        firstName: 'Gamma',
        lastName: 'Zulu',
        primaryGoal: ClientPrimaryGoal.STRENGTH,
        experienceLevel: ClientExperienceLevel.ADVANCED,
      });

      await request(http)
        .patch(`/api/v1/clients/${disabled.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      const defaults = await request(http)
        .get('/api/v1/clients')
        .set('Authorization', authorization)
        .expect(200);
      expect(defaults.body.meta).toEqual(
        expect.objectContaining({ page: 1, limit: 20, totalItems: 3 }),
      );

      const page = await request(http)
        .get('/api/v1/clients')
        .query({ page: 1, limit: 2, sort: 'firstName', direction: 'ASC' })
        .set('Authorization', authorization)
        .expect(200);
      expect(page.body.meta).toEqual({
        page: 1,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
      expect(page.body.data[0].user.firstName).toBe('Alpha');
      assertNoSecrets(page.body);

      const search = await request(http)
        .get('/api/v1/clients')
        .query({ search: 'Searchable' })
        .set('Authorization', authorization)
        .expect(200);
      expect(search.body.data).toHaveLength(1);

      const goal = await request(http)
        .get('/api/v1/clients')
        .query({ primaryGoal: ClientPrimaryGoal.FAT_LOSS })
        .set('Authorization', authorization)
        .expect(200);
      expect(goal.body.data).toHaveLength(1);

      const level = await request(http)
        .get('/api/v1/clients')
        .query({ experienceLevel: ClientExperienceLevel.ADVANCED })
        .set('Authorization', authorization)
        .expect(200);
      expect(level.body.data).toHaveLength(1);

      const status = await request(http)
        .get('/api/v1/clients')
        .query({ status: UserStatus.DISABLED })
        .set('Authorization', authorization)
        .expect(200);
      expect(status.body.data).toHaveLength(1);

      await request(http)
        .get('/api/v1/clients')
        .query({ limit: 101 })
        .set('Authorization', authorization)
        .expect(400);

      await request(http)
        .get('/api/v1/clients')
        .query({ sort: 'passwordHash' })
        .set('Authorization', authorization)
        .expect(400);

      const trainer = await createUser({
        email: 'lister@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .get('/api/v1/clients')
        .set('Authorization', await authHeader(trainer.email))
        .expect(403);

      await request(http).get('/api/v1/clients').expect(401);
    });
  });

  describe('GET /api/v1/clients/:id', () => {
    it('returns an existing client and rejects invalid or unauthorized access', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionClient(authorization);

      const found = await request(http)
        .get(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .expect(200);
      expect(found.body.id).toBe(created.id);
      assertNoSecrets(found.body);

      await request(http)
        .get(`/api/v1/clients/${randomUUID()}`)
        .set('Authorization', authorization)
        .expect(404);

      await request(http)
        .get('/api/v1/clients/not-a-uuid')
        .set('Authorization', authorization)
        .expect(400);

      const trainer = await createUser({
        email: 'viewer-trainer@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .get(`/api/v1/clients/${created.id}`)
        .set('Authorization', await authHeader(trainer.email))
        .expect(403);

      const otherClient = await createUser({
        email: 'viewer-client@example.com',
        role: UserRole.CLIENT,
      });
      await request(http)
        .get(`/api/v1/clients/${created.id}`)
        .set('Authorization', await authHeader(otherClient.email))
        .expect(403);

      await request(http).get(`/api/v1/clients/${created.id}`).expect(401);
    });
  });

  describe('current client profile', () => {
    it('resolves GET and PATCH /me from the authenticated client only', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionClient(authorization);
      const other = await provisionClient(authorization, {
        email: 'other-client@example.com',
        firstName: 'Other',
      });

      const clientAuth = await authHeader(created.user.email);

      const me = await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(me.body.id).toBe(created.id);
      assertNoSecrets(me.body);

      const updated = await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({
          phone: '555-0199',
          primaryGoal: ClientPrimaryGoal.STRENGTH,
          goalNotes: 'Updated notes',
          experienceLevel: ClientExperienceLevel.INTERMEDIATE,
        })
        .expect(200);
      expect(updated.body.phone).toBe('555-0199');
      expect(updated.body.primaryGoal).toBe(ClientPrimaryGoal.STRENGTH);
      expect(updated.body.user.email).toBe('client@example.com');

      const otherAfter = await request(http)
        .get(`/api/v1/clients/${other.id}`)
        .set('Authorization', authorization)
        .expect(200);
      expect(otherAfter.body.phone).not.toBe('555-0199');

      await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({ email: 'hijack@example.com' })
        .expect(400);

      await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({ role: UserRole.ADMIN })
        .expect(400);

      await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({ status: UserStatus.ACTIVE })
        .expect(400);

      await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({ password: 'brand-new-password' })
        .expect(400);

      await request(http)
        .patch('/api/v1/clients/me')
        .set('Authorization', clientAuth)
        .send({ userId: other.user.id })
        .expect(400);

      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', authorization)
        .expect(403);

      const trainer = await createUser({
        email: 'trainer-me@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', await authHeader(trainer.email))
        .expect(403);
    });

    it('does not silently create a missing client profile', async () => {
      const orphan = await createUser({
        email: 'orphan-client@example.com',
        role: UserRole.CLIENT,
      });

      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', await authHeader(orphan.email))
        .expect(500);

      expect(await profiles.count({ where: { userId: orphan.id } })).toBe(0);
    });
  });

  describe('PATCH /api/v1/clients/:id', () => {
    it('lets ADMIN update identity and profile, and rejects mass assignment', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionClient(authorization);
      await provisionClient(authorization, {
        email: 'taken@example.com',
        firstName: 'Taken',
      });

      const updated = await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .send({
          email: 'renamed@example.com',
          firstName: 'Renamed',
          lastName: 'Athlete',
          phone: '555-0111',
          dateOfBirth: '1990-01-02',
          primaryGoal: ClientPrimaryGoal.FAT_LOSS,
          goalNotes: 'New notes',
          experienceLevel: ClientExperienceLevel.ADVANCED,
        })
        .expect(200);

      expect(updated.body.user.email).toBe('renamed@example.com');
      expect(updated.body.dateOfBirth).toBe('1990-01-02');
      expect(updated.body.user.role).toBe(UserRole.CLIENT);
      assertNoSecrets(updated.body);

      await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .send({ email: 'Taken@Example.com' })
        .expect(409);

      await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .send({ role: UserRole.ADMIN })
        .expect(400);

      await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(400);

      await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', authorization)
        .send({ password: 'another-long-password' })
        .expect(400);

      const trainer = await createUser({
        email: 'patcher@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .patch(`/api/v1/clients/${created.id}`)
        .set('Authorization', await authHeader(trainer.email))
        .send({ firstName: 'Nope' })
        .expect(403);
    });
  });

  describe('client status', () => {
    it('disables a client, revokes only that client session, and requires a fresh login after re-enable', async () => {
      const { authorization, user: admin } = await createAdmin();
      const created = await provisionClient(authorization);
      const other = await provisionClient(authorization, {
        email: 'other-session@example.com',
        firstName: 'Other',
      });

      const clientLogin = await login(created.user.email);
      const otherLogin = await login(other.user.email);
      const adminLogin = await login(admin.email);

      await request(http)
        .patch(`/api/v1/clients/${created.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      expect(
        await sessions.count({
          where: { userId: created.user.id, revokedAt: IsNull() },
        }),
      ).toBe(0);

      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: created.user.email, password: PASSWORD })
        .expect(401);

      await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${COOKIE}=${clientLogin.cookie}`)
        .expect(401);

      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${clientLogin.accessToken}`)
        .expect(401);

      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', `Bearer ${clientLogin.accessToken}`)
        .expect(401);

      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminLogin.accessToken}`)
        .expect(200);

      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', `Bearer ${otherLogin.accessToken}`)
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${created.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);

      await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${COOKIE}=${clientLogin.cookie}`)
        .expect(401);

      const fresh = await login(created.user.email);
      await request(http)
        .get('/api/v1/clients/me')
        .set('Authorization', `Bearer ${fresh.accessToken}`)
        .expect(200);
    });
  });

  describe('data integrity', () => {
    it('enforces unique user_id, foreign key, and CLIENT-only creation through the service', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionClient(authorization);

      try {
        await profiles.save(
          profiles.create({
            userId: created.user.id,
            primaryGoal: ClientPrimaryGoal.OTHER,
            experienceLevel: ClientExperienceLevel.BEGINNER,
          }),
        );
        throw new Error('expected unique user_id violation');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      try {
        await profiles.insert({
          userId: randomUUID(),
          primaryGoal: ClientPrimaryGoal.OTHER,
          experienceLevel: ClientExperienceLevel.BEGINNER,
        });
        throw new Error('expected foreign key violation');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      const forced = await dataSource.transaction(async (manager) => {
        return usersService.createClientUser(manager, {
          email: 'forced-role@example.com',
          passwordHash: await hasher.hash(PASSWORD),
          firstName: 'Forced',
          lastName: 'Role',
        });
      });
      expect(forced.role).toBe(UserRole.CLIENT);
      expect(forced.status).toBe(UserStatus.ACTIVE);
    });
  });
});
