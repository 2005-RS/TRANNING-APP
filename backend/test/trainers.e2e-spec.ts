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
import { TrainerProfile } from '../src/modules/trainers/entities/trainer-profile.entity';
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
}

describe('Trainers (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let sessions: Repository<AuthSession>;
  let profiles: Repository<TrainerProfile>;
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
    profiles = dataSource.getRepository(TrainerProfile);
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

  function trainerPayload(overrides: Record<string, unknown> = {}) {
    return {
      email: 'trainer@example.com',
      password: PASSWORD,
      firstName: 'Tia',
      lastName: 'Trainer',
      phone: '+1 555 0100',
      professionalTitle: 'Strength coach',
      bio: 'Plain text bio',
      ...overrides,
    };
  }

  async function provisionTrainer(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', authorization)
      .send(trainerPayload(overrides))
      .expect(201);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body.accessToken).toBeUndefined();
    assertNoSecrets(response.body);
    return response.body as {
      id: string;
      user: { id: string; email: string; role: string; status: string };
      phone: string | null;
      professionalTitle: string | null;
      bio: string | null;
    };
  }

  describe('POST /api/v1/trainers', () => {
    it('lets ADMIN create User + TrainerProfile atomically without logging the trainer in', async () => {
      const { authorization } = await createAdmin();

      const created = await provisionTrainer(authorization);

      expect(created.id).toEqual(expect.any(String));
      expect(created.user).toEqual(
        expect.objectContaining({
          email: 'trainer@example.com',
          firstName: 'Tia',
          lastName: 'Trainer',
          role: UserRole.TRAINER,
          status: UserStatus.ACTIVE,
        }),
      );
      expect(created.phone).toBe('+1 555 0100');
      expect(created.professionalTitle).toBe('Strength coach');
      expect(created.bio).toBe('Plain text bio');

      expect(await profiles.count()).toBe(1);
      expect(await users.count({ where: { role: UserRole.TRAINER } })).toBe(1);
    });

    it('rejects role injection and unauthorized creators', async () => {
      const { authorization } = await createAdmin();

      await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', authorization)
        .send(trainerPayload({ role: UserRole.ADMIN }))
        .expect(400);

      await request(http)
        .post('/api/v1/trainers')
        .send(trainerPayload({ email: 'anon@example.com' }))
        .expect(401);

      const trainer = await createUser({
        email: 'existing-trainer@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', await authHeader(trainer.email))
        .send(trainerPayload({ email: 'blocked-trainer@example.com' }))
        .expect(403);

      const client = await createUser({
        email: 'client@example.com',
        role: UserRole.CLIENT,
      });
      await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', await authHeader(client.email))
        .send(trainerPayload({ email: 'blocked-client@example.com' }))
        .expect(403);
    });

    it('returns 409 for duplicate emails including case-normalized matches', async () => {
      const { authorization } = await createAdmin();
      await provisionTrainer(authorization, { email: 'Trainer@Example.com' });

      const duplicate = await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', authorization)
        .send(trainerPayload({ email: 'trainer@example.com' }))
        .expect(409);

      expect(duplicate.body.statusCode).toBe(409);
      expect(duplicate.body.message).toBe('Email already in use');

      const matching = await users.find({
        where: { email: 'trainer@example.com' },
      });
      expect(matching).toHaveLength(1);
    });

    it('rolls back the TRAINER user when profile persistence fails', async () => {
      const { authorization } = await createAdmin();
      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(TrainerProfile);
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
          .post('/api/v1/trainers')
          .set('Authorization', authorization)
          .send(trainerPayload({ email: 'orphan-check@example.com' }))
          .expect(500);

        const leftover = await users.findOne({
          where: { email: 'orphan-check@example.com' },
        });
        expect(leftover).toBeNull();
        expect(await users.count({ where: { role: UserRole.TRAINER } })).toBe(
          0,
        );
        expect(await profiles.count()).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('GET /api/v1/trainers', () => {
    it('paginates, searches, filters, sorts, and hides secrets', async () => {
      const { authorization } = await createAdmin();
      await provisionTrainer(authorization, {
        email: 'alpha@example.com',
        firstName: 'Alpha',
        lastName: 'Nadir',
      });
      await provisionTrainer(authorization, {
        email: 'beta@example.com',
        firstName: 'Beta',
        lastName: 'Searchable',
      });
      const disabled = await provisionTrainer(authorization, {
        email: 'gamma@example.com',
        firstName: 'Gamma',
        lastName: 'Zulu',
      });

      await request(http)
        .patch(`/api/v1/trainers/${disabled.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      await request(http).get('/api/v1/trainers').expect(401);

      const defaults = await request(http)
        .get('/api/v1/trainers')
        .set('Authorization', authorization)
        .expect(200);
      expect(defaults.body.meta).toEqual(
        expect.objectContaining({ page: 1, limit: 20, totalItems: 3 }),
      );

      const page = await request(http)
        .get('/api/v1/trainers')
        .query({ page: 1, limit: 2, sort: 'firstName', direction: 'ASC' })
        .set('Authorization', authorization)
        .expect(200);

      expect(page.body.meta).toEqual({
        page: 1,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
      expect(page.body.data).toHaveLength(2);
      expect(page.body.data[0].user.firstName).toBe('Alpha');
      expect(page.body.data[1].user.firstName).toBe('Beta');
      assertNoSecrets(page.body);

      const search = await request(http)
        .get('/api/v1/trainers')
        .query({ search: 'Searchable' })
        .set('Authorization', authorization)
        .expect(200);
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].user.email).toBe('beta@example.com');

      const firstNameSearch = await request(http)
        .get('/api/v1/trainers')
        .query({ search: 'Alpha' })
        .set('Authorization', authorization)
        .expect(200);
      expect(firstNameSearch.body.data).toHaveLength(1);
      expect(firstNameSearch.body.data[0].user.firstName).toBe('Alpha');

      const emailSearch = await request(http)
        .get('/api/v1/trainers')
        .query({ search: 'ALPHA@EXAMPLE.COM' })
        .set('Authorization', authorization)
        .expect(200);
      expect(emailSearch.body.data).toHaveLength(1);

      const status = await request(http)
        .get('/api/v1/trainers')
        .query({ status: UserStatus.DISABLED })
        .set('Authorization', authorization)
        .expect(200);
      expect(status.body.data).toHaveLength(1);
      expect(status.body.data[0].id).toBe(disabled.id);

      await request(http)
        .get('/api/v1/trainers')
        .query({ limit: 101 })
        .set('Authorization', authorization)
        .expect(400);

      await request(http)
        .get('/api/v1/trainers')
        .query({ sort: 'passwordHash' })
        .set('Authorization', authorization)
        .expect(400);

      const trainer = await createUser({
        email: 'lister@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .get('/api/v1/trainers')
        .set('Authorization', await authHeader(trainer.email))
        .expect(403);
    });
  });

  describe('GET /api/v1/trainers/:id', () => {
    it('returns an existing trainer and rejects invalid or unauthorized access', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionTrainer(authorization);

      const found = await request(http)
        .get(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .expect(200);
      expect(found.body.id).toBe(created.id);
      assertNoSecrets(found.body);

      await request(http)
        .get(`/api/v1/trainers/${randomUUID()}`)
        .set('Authorization', authorization)
        .expect(404);

      await request(http)
        .get('/api/v1/trainers/not-a-uuid')
        .set('Authorization', authorization)
        .expect(400);

      const trainer = await createUser({
        email: 'viewer@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .get(`/api/v1/trainers/${created.id}`)
        .set('Authorization', await authHeader(trainer.email))
        .expect(403);

      const client = await createUser({
        email: 'client-viewer@example.com',
        role: UserRole.CLIENT,
      });
      await request(http)
        .get(`/api/v1/trainers/${created.id}`)
        .set('Authorization', await authHeader(client.email))
        .expect(403);
    });
  });

  describe('current trainer profile', () => {
    it('resolves GET and PATCH /me from the authenticated trainer only', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionTrainer(authorization);
      const other = await provisionTrainer(authorization, {
        email: 'other-trainer@example.com',
        firstName: 'Other',
      });

      const trainerAuth = await authHeader(created.user.email);

      const me = await request(http)
        .get('/api/v1/trainers/me')
        .query({ userId: other.user.id, id: other.id })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(me.body.id).toBe(created.id);
      expect(me.body.user.email).toBe('trainer@example.com');
      assertNoSecrets(me.body);

      const updated = await request(http)
        .patch('/api/v1/trainers/me')
        .set('Authorization', trainerAuth)
        .send({
          phone: '555-0199',
          professionalTitle: 'Updated title',
          bio: 'Updated bio',
        })
        .expect(200);
      expect(updated.body.phone).toBe('555-0199');
      expect(updated.body.professionalTitle).toBe('Updated title');
      expect(updated.body.bio).toBe('Updated bio');
      expect(updated.body.user.email).toBe('trainer@example.com');

      const otherAfter = await request(http)
        .get(`/api/v1/trainers/${other.id}`)
        .set('Authorization', authorization)
        .expect(200);
      expect(otherAfter.body.phone).not.toBe('555-0199');

      await request(http)
        .patch('/api/v1/trainers/me')
        .set('Authorization', trainerAuth)
        .send({ role: UserRole.ADMIN })
        .expect(400);

      await request(http)
        .patch('/api/v1/trainers/me')
        .set('Authorization', trainerAuth)
        .send({ status: UserStatus.ACTIVE })
        .expect(400);

      await request(http)
        .patch('/api/v1/trainers/me')
        .set('Authorization', trainerAuth)
        .send({ email: 'hijack@example.com' })
        .expect(400);

      await request(http)
        .patch('/api/v1/trainers/me')
        .set('Authorization', trainerAuth)
        .send({ password: 'brand-new-password' })
        .expect(400);

      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', authorization)
        .expect(403);

      const client = await createUser({
        email: 'client-me@example.com',
        role: UserRole.CLIENT,
      });
      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', await authHeader(client.email))
        .expect(403);
    });

    it('does not silently create a missing trainer profile', async () => {
      const orphan = await createUser({
        email: 'orphan-trainer@example.com',
        role: UserRole.TRAINER,
      });

      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', await authHeader(orphan.email))
        .expect(500);

      expect(await profiles.count({ where: { userId: orphan.id } })).toBe(0);
    });
  });

  describe('PATCH /api/v1/trainers/:id', () => {
    it('lets ADMIN update identity and profile, and rejects mass assignment', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionTrainer(authorization);
      await provisionTrainer(authorization, {
        email: 'taken@example.com',
        firstName: 'Taken',
      });

      const updated = await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({
          email: 'renamed@example.com',
          firstName: 'Renamed',
          lastName: 'Coach',
          phone: '555-0111',
          professionalTitle: 'Head coach',
          bio: 'New bio',
        })
        .expect(200);

      expect(updated.body.user.email).toBe('renamed@example.com');
      expect(updated.body.user.firstName).toBe('Renamed');
      expect(updated.body.user.lastName).toBe('Coach');
      expect(updated.body.user.role).toBe(UserRole.TRAINER);
      expect(updated.body.phone).toBe('555-0111');
      assertNoSecrets(updated.body);

      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({ email: 'Taken@Example.com' })
        .expect(409);

      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({ role: UserRole.ADMIN })
        .expect(400);

      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(400);

      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({ password: 'another-long-password' })
        .expect(400);

      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', authorization)
        .send({ passwordHash: 'not-a-hash' })
        .expect(400);

      const trainer = await createUser({
        email: 'patcher@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .patch(`/api/v1/trainers/${created.id}`)
        .set('Authorization', await authHeader(trainer.email))
        .send({ firstName: 'Nope' })
        .expect(403);
    });
  });

  describe('trainer status', () => {
    it('disables a trainer, revokes sessions, and requires a fresh login after re-enable', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionTrainer(authorization);
      const trainerLogin = await login(created.user.email);
      expect(trainerLogin.cookie).toBeTruthy();

      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${trainerLogin.accessToken}`)
        .expect(200);

      const disabled = await request(http)
        .patch(`/api/v1/trainers/${created.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      expect(disabled.body.user.status).toBe(UserStatus.DISABLED);

      const persisted = await users.findOneByOrFail({ id: created.user.id });
      expect(persisted.status).toBe(UserStatus.DISABLED);

      const openSessions = await sessions.count({
        where: { userId: created.user.id, revokedAt: IsNull() },
      });
      expect(openSessions).toBe(0);
      const allSessions = await sessions.find({
        where: { userId: created.user.id },
      });
      expect(allSessions.length).toBeGreaterThan(0);
      expect(allSessions.every((session) => session.revokedAt !== null)).toBe(
        true,
      );

      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: created.user.email, password: PASSWORD })
        .expect(401);

      await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${COOKIE}=${trainerLogin.cookie}`)
        .expect(401);

      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${trainerLogin.accessToken}`)
        .expect(401);

      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', `Bearer ${trainerLogin.accessToken}`)
        .expect(401);

      const reenabled = await request(http)
        .patch(`/api/v1/trainers/${created.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);
      expect(reenabled.body.user.status).toBe(UserStatus.ACTIVE);

      await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${COOKIE}=${trainerLogin.cookie}`)
        .expect(401);

      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${trainerLogin.accessToken}`)
        .expect(401);

      const fresh = await login(created.user.email);
      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', `Bearer ${fresh.accessToken}`)
        .expect(200);
    });
  });

  describe('data integrity', () => {
    it('enforces unique user_id, foreign key, and TRAINER-only creation through the service', async () => {
      const { authorization } = await createAdmin();
      const created = await provisionTrainer(authorization);

      try {
        await profiles.save(
          profiles.create({
            userId: created.user.id,
            phone: '555-0000',
          }),
        );
        throw new Error('expected unique user_id violation');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      try {
        await profiles.insert({
          userId: randomUUID(),
          phone: '555-0001',
        });
        throw new Error('expected foreign key violation');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      const forced = await dataSource.transaction(async (manager) => {
        return usersService.createTrainerUser(manager, {
          email: 'forced-role@example.com',
          passwordHash: await hasher.hash(PASSWORD),
          firstName: 'Forced',
          lastName: 'Role',
        });
      });
      expect(forced.role).toBe(UserRole.TRAINER);
      expect(forced.status).toBe(UserStatus.ACTIVE);

      await users.delete({ id: created.user.id });
      expect(
        await profiles.findOne({ where: { userId: created.user.id } }),
      ).toBeNull();
    });
  });
});
