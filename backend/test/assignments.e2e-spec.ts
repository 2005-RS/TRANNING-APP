import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { isPostgresUniqueViolation } from '../src/database/postgres-errors';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { TrainerClientAssignment } from '../src/modules/trainer-client-assignments/entities/trainer-client-assignment.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
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

describe('Trainer-client assignments (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let assignments: Repository<TrainerClientAssignment>;
  let hasher: PasswordHasherService;

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
    assignments = dataSource.getRepository(TrainerClientAssignment);
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
    return users.save(
      users.create({
        email: overrides.email,
        passwordHash: await hasher.hash(PASSWORD),
        firstName: overrides.firstName ?? 'Ada',
        lastName: overrides.lastName ?? 'Admin',
        role: overrides.role,
        status: overrides.status ?? UserStatus.ACTIVE,
      }),
    );
  }

  async function login(email: string) {
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

  async function createAdmin() {
    const user = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    return { user, authorization: await authHeader(user.email) };
  }

  async function provisionTrainer(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', authorization)
      .send({
        email: 'trainer@example.com',
        password: PASSWORD,
        firstName: 'Tia',
        lastName: 'Trainer',
        ...overrides,
      })
      .expect(201);
    return response.body as { id: string; user: { id: string; email: string } };
  }

  async function provisionClient(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(http)
      .post('/api/v1/clients')
      .set('Authorization', authorization)
      .send({
        email: 'client@example.com',
        password: PASSWORD,
        firstName: 'Cara',
        lastName: 'Client',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.BEGINNER,
        ...overrides,
      })
      .expect(201);
    return response.body as { id: string; user: { id: string; email: string } };
  }

  describe('admin assignment', () => {
    it('assigns, is idempotent, reassigns atomically, and preserves history on unassign', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);

      const before = await request(http)
        .get(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .expect(200);
      expect(before.body.trainer).toBeNull();

      const assigned = await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerA.id })
        .expect(200);
      expect(assigned.body.trainer.id).toBe(trainerA.id);

      const again = await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerA.id })
        .expect(200);
      expect(again.body.id).toBe(assigned.body.id);
      expect(await assignments.count()).toBe(1);
      expect(await assignments.count({ where: { endedAt: IsNull() } })).toBe(1);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerB.id })
        .expect(200);
      expect(await assignments.count()).toBe(2);
      expect(await assignments.count({ where: { endedAt: IsNull() } })).toBe(1);

      await request(http)
        .delete(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .expect(204);
      await request(http)
        .delete(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .expect(204);

      const after = await request(http)
        .get(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .expect(200);
      expect(after.body.trainer).toBeNull();
      expect(await assignments.count()).toBe(2);
      expect(await assignments.count({ where: { endedAt: IsNull() } })).toBe(0);

      const history = await request(http)
        .get(`/api/v1/clients/${client.id}/trainer-history`)
        .set('Authorization', authorization)
        .expect(200);
      expect(history.body.meta.totalItems).toBe(2);
      expect(history.body.data[0].trainer.id).toBe(trainerB.id);
      expect(history.body.data[0].endedAt).toBeTruthy();
      expect(history.body.data[1].trainer.id).toBe(trainerA.id);
      expect(history.body.data[1].endedAt).toBeTruthy();
    });

    it('rejects unauthorized actors, mass assignment, disabled accounts, and unknown IDs', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .send({ trainerId: trainer.id })
        .expect(401);

      const otherTrainer = await createUser({
        email: 'probe-trainer@example.com',
        role: UserRole.TRAINER,
      });
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', await authHeader(otherTrainer.email))
        .send({ trainerId: trainer.id })
        .expect(403);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({
          trainerId: trainer.id,
          assignedAt: '2020-01-01T00:00:00.000Z',
          assignedByUserId: randomUUID(),
        })
        .expect(400);

      await request(http)
        .put(`/api/v1/clients/not-a-uuid/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(400);

      await request(http)
        .put(`/api/v1/clients/${randomUUID()}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(404);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: randomUUID() })
        .expect(404);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: 'not-a-uuid' })
        .expect(400);

      await request(http)
        .put(`/api/v1/clients/${trainer.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(404);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: client.id })
        .expect(404);

      await request(http)
        .patch(`/api/v1/trainers/${trainer.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(409);

      await request(http)
        .patch(`/api/v1/trainers/${trainer.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(409);
    });

    it('rolls back reassignment when the new assignment cannot persist', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerA.id })
        .expect(200);

      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(TrainerClientAssignment);
            const originalSave = repo.save.bind(repo);
            let saves = 0;
            jest.spyOn(repo, 'save').mockImplementation(async (entity) => {
              saves += 1;
              if (saves === 2) {
                throw new Error('forced assignment insert failure');
              }
              return originalSave(entity);
            });
            return (
              runInTransaction as (m: typeof manager) => Promise<unknown>
            )(manager);
          });
        });

      try {
        await request(http)
          .put(`/api/v1/clients/${client.id}/trainer`)
          .set('Authorization', authorization)
          .send({ trainerId: trainerB.id })
          .expect(500);

        const current = await request(http)
          .get(`/api/v1/clients/${client.id}/trainer`)
          .set('Authorization', authorization)
          .expect(200);
        expect(current.body.trainer.id).toBe(trainerA.id);
        expect(await assignments.count({ where: { endedAt: IsNull() } })).toBe(
          1,
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('relationship authorization', () => {
    it('grants Trainer A access immediately and hides the client from Trainer B until reassignment', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);

      const trainerAAuth = await login(trainerA.user.email);
      const trainerBAuth = await login(trainerB.user.email);
      const clientAuth = await login(client.user.email);

      const beforeMine = await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', `Bearer ${clientAuth.accessToken}`)
        .expect(200);
      expect(beforeMine.body.trainer).toBeNull();

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerA.id })
        .expect(200);

      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', `Bearer ${trainerAAuth.accessToken}`)
        .expect(200);
      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', `Bearer ${trainerBAuth.accessToken}`)
        .expect(404);

      const listed = await request(http)
        .get('/api/v1/trainers/me/clients')
        .set('Authorization', `Bearer ${trainerAAuth.accessToken}`)
        .expect(200);
      expect(listed.body.data).toHaveLength(1);
      expect(listed.body.data[0].id).toBe(client.id);
      expect(JSON.stringify(listed.body)).not.toContain('passwordHash');

      const unlisted = await request(http)
        .get('/api/v1/trainers/me/clients')
        .set('Authorization', `Bearer ${trainerBAuth.accessToken}`)
        .expect(200);
      expect(unlisted.body.data).toHaveLength(0);

      const clientView = await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', `Bearer ${clientAuth.accessToken}`)
        .expect(200);
      expect(clientView.body.trainer.id).toBe(trainerA.id);

      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerB.id })
        .expect(200);

      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', `Bearer ${trainerAAuth.accessToken}`)
        .expect(404);
      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', `Bearer ${trainerBAuth.accessToken}`)
        .expect(200);
      await request(http)
        .get('/api/v1/trainers/me')
        .set('Authorization', `Bearer ${trainerAAuth.accessToken}`)
        .expect(200);

      const afterReassign = await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', `Bearer ${clientAuth.accessToken}`)
        .expect(200);
      expect(afterReassign.body.trainer.id).toBe(trainerB.id);

      await request(http)
        .delete(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .expect(204);

      const afterUnassign = await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', `Bearer ${clientAuth.accessToken}`)
        .expect(200);
      expect(afterUnassign.body.trainer).toBeNull();
    });

    it('keeps trainer list scoped to active assignments and supports search', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const assigned = await provisionClient(authorization, {
        email: 'visible@example.com',
        firstName: 'Visible',
      });
      await provisionClient(authorization, {
        email: 'hidden@example.com',
        firstName: 'Hidden',
      });
      await request(http)
        .put(`/api/v1/clients/${assigned.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(200);

      const trainerAuth = await authHeader(trainer.user.email);
      const search = await request(http)
        .get('/api/v1/trainers/me/clients')
        .query({ search: 'Hidden' })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(search.body.data).toHaveLength(0);

      const visible = await request(http)
        .get('/api/v1/trainers/me/clients')
        .query({ search: 'Visible' })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(visible.body.data).toHaveLength(1);

      await request(http)
        .get('/api/v1/trainers/me/clients')
        .set('Authorization', authorization)
        .expect(403);
    });

    it('enforces the role matrix without leaking unassigned clients', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainer.id })
        .expect(200);

      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      await request(http)
        .get(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', trainerAuth)
        .expect(403);
      await request(http)
        .get(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .get(`/api/v1/clients/${client.id}/trainer-history`)
        .set('Authorization', trainerAuth)
        .expect(403);
      await request(http)
        .delete(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', trainerAuth)
        .expect(403);
      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .get(`/api/v1/trainers/me/clients/${client.id}`)
        .set('Authorization', authorization)
        .expect(403);
      await request(http)
        .get('/api/v1/trainers/me/clients')
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', clientAuth)
        .send({ trainerId: trainer.id })
        .expect(403);
      await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', trainerAuth)
        .expect(403);
      await request(http)
        .get('/api/v1/clients/me/trainer')
        .set('Authorization', authorization)
        .expect(403);
    });
  });

  describe('integrity', () => {
    it('rejects a second active assignment for the same client at the database', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);
      await request(http)
        .put(`/api/v1/clients/${client.id}/trainer`)
        .set('Authorization', authorization)
        .send({ trainerId: trainerA.id })
        .expect(200);

      try {
        await assignments.save(
          assignments.create({
            trainerProfileId: trainerB.id,
            clientProfileId: client.id,
            assignedAt: new Date(),
            endedAt: null,
            assignedByUserId: admin.id,
          }),
        );
        throw new Error('expected unique active assignment violation');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      expect(await assignments.count({ where: { endedAt: IsNull() } })).toBe(1);
    });
  });
});
