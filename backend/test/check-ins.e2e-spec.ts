import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { isPostgresUniqueViolation } from '../src/database/postgres-errors';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { CheckInReview } from '../src/modules/check-ins/entities/check-in-review.entity';
import { CheckIn } from '../src/modules/check-ins/entities/check-in.entity';
import { CheckInStatus } from '../src/modules/check-ins/enums/check-in-status.enum';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
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

function readId(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof body.id !== 'string'
  ) {
    throw new Error('expected an id');
  }
  return body.id;
}

describe('Check-ins (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
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

  async function authHeader(email: string): Promise<string> {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(readCookie(response, COOKIE)).toBeTruthy();
    return `Bearer ${response.body.accessToken as string}`;
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

  async function assign(
    authorization: string,
    clientId: string,
    trainerId: string,
  ) {
    await request(http)
      .put(`/api/v1/clients/${clientId}/trainer`)
      .set('Authorization', authorization)
      .send({ trainerId })
      .expect(200);
  }

  it('lets a Client create, update, submit, and read a CheckIn without other domain data', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({ periodStart: '2026-08-24', periodEnd: '2026-08-30' })
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.submittedAt).toBeNull();
    expect(created.body.responses.energyLevel).toBeNull();
    expect(created.body).not.toHaveProperty('clientProfileId');
    expect(created.body).not.toHaveProperty('trainerId');

    const checkInId = readId(created.body);

    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(409);

    const patched = await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', clientAuth)
      .send({
        energyLevel: 4,
        wins: '  Completed all planned workouts.  ',
      })
      .expect(200);
    expect(patched.body.responses.energyLevel).toBe(4);
    expect(patched.body.responses.wins).toBe('Completed all planned workouts.');

    const submitted = await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);
    expect(submitted.body.status).toBe('SUBMITTED');
    expect(submitted.body.submittedAt).toBeTruthy();
    const submittedAt = submitted.body.submittedAt as string;

    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', clientAuth)
      .send({ energyLevel: 5 })
      .expect(409);

    const repeated = await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);
    expect(repeated.body.submittedAt).toBe(submittedAt);

    const listed = await request(http)
      .get('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).not.toHaveProperty('responses');
    expect(listed.body.data[0]).not.toHaveProperty('wins');
    expect(listed.body.meta.page).toBe(1);

    await request(http)
      .get('/api/v1/clients/me/check-ins?dateFrom=2026-08-10&dateTo=2026-08-01')
      .set('Authorization', clientAuth)
      .expect(400);

    await request(http)
      .get('/api/v1/clients/me/nutrition-plans')
      .set('Authorization', clientAuth)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual([]);
      });
    await request(http)
      .get('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual([]);
      });
  });

  it('keeps DRAFT private from Trainer and ADMIN until SUBMITTED', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainer = await provisionTrainer(admin.authorization);
    await assign(admin.authorization, client.id, trainer.id);
    const clientAuth = await authHeader(client.user.email);
    const trainerAuth = await authHeader(trainer.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        energyLevel: 3,
      })
      .expect(201);
    const checkInId = readId(created.body);

    await request(http)
      .get(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', clientAuth)
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', trainerAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', admin.authorization)
      .expect(404);

    const listed = await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins`)
      .set('Authorization', trainerAuth)
      .expect(200);
    expect(listed.body.data).toEqual([]);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins?status=DRAFT`)
      .set('Authorization', trainerAuth)
      .expect(400);

    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', trainerAuth)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', admin.authorization)
      .expect(200);
  });

  it('allows DRAFT delete and forbids deleting submitted history', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    const draft = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({ periodStart: '2026-08-24', periodEnd: '2026-08-30' })
      .expect(201);
    const draftId = readId(draft.body);

    await request(http)
      .delete(`/api/v1/clients/me/check-ins/${draftId}`)
      .set('Authorization', clientAuth)
      .expect(204);
    await request(http)
      .get(`/api/v1/clients/me/check-ins/${draftId}`)
      .set('Authorization', clientAuth)
      .expect(404);

    const submitted = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        energyLevel: 4,
      })
      .expect(201);
    const submittedId = readId(submitted.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${submittedId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    await request(http)
      .delete(`/api/v1/clients/me/check-ins/${submittedId}`)
      .set('Authorization', clientAuth)
      .expect(409);
  });

  it('lets the current Trainer review a submitted CheckIn and rejects a second review', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainer = await provisionTrainer(admin.authorization);
    await assign(admin.authorization, client.id, trainer.id);
    const clientAuth = await authHeader(client.user.email);
    const trainerAuth = await authHeader(trainer.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        energyLevel: 4,
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    const reviewed = await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', trainerAuth)
      .send({
        feedback: 'Keep the current training load.',
        actionItems: 'Prioritize meal preparation.',
      })
      .expect(201);
    expect(reviewed.body.status).toBe('REVIEWED');
    expect(reviewed.body.review.reviewedByUserId).toBe(trainer.user.id);
    expect(reviewed.body.review).not.toHaveProperty('passwordHash');

    const clientDetail = await request(http)
      .get(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(clientDetail.body.review.feedback).toBe(
      'Keep the current training load.',
    );

    await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', trainerAuth)
      .send({ feedback: 'Second review' })
      .expect(409);

    const reviews = dataSource.getRepository(CheckInReview);
    try {
      await reviews.save(
        reviews.create({
          checkInId,
          reviewedByUserId: trainer.user.id,
          feedback: 'Direct insert',
        }),
      );
      throw new Error('expected unique review constraint');
    } catch (error) {
      expect(isPostgresUniqueViolation(error)).toBe(true);
    }

    const updated = await request(http)
      .patch(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', trainerAuth)
      .send({ feedback: 'Adjusted: keep load, add recovery.' })
      .expect(200);
    expect(updated.body.review.feedback).toBe(
      'Adjusted: keep load, add recovery.',
    );
    expect(updated.body.review.reviewedByUserId).toBe(trainer.user.id);
    expect(updated.body.review.createdAt).toBe(reviewed.body.review.createdAt);
    expect(updated.body.review.updatedAt).not.toBe(
      reviewed.body.review.updatedAt,
    );
  });

  it('moves submitted unreviewed access to the new Trainer who may then review', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainerA = await provisionTrainer(admin.authorization);
    const trainerB = await provisionTrainer(admin.authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    await assign(admin.authorization, client.id, trainerA.id);
    const clientAuth = await authHeader(client.user.email);
    const authA = await authHeader(trainerA.user.email);
    const authB = await authHeader(trainerB.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        stressLevel: 2,
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authA)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(404);

    await assign(admin.authorization, client.id, trainerB.id);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authA)
      .expect(404);
    const visible = await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(200);
    expect(visible.body.responses.stressLevel).toBe(2);

    const reviewed = await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', authB)
      .send({ feedback: 'Welcome to the new block.' })
      .expect(201);
    expect(reviewed.body.review.reviewedByUserId).toBe(trainerB.user.id);
  });

  it('preserves review provenance after reassignment and blocks overwrite', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainerA = await provisionTrainer(admin.authorization);
    const trainerB = await provisionTrainer(admin.authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    await assign(admin.authorization, client.id, trainerA.id);
    const clientAuth = await authHeader(client.user.email);
    const authA = await authHeader(trainerA.user.email);
    const authB = await authHeader(trainerB.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        recoveryLevel: 4,
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);
    await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', authA)
      .send({ feedback: 'Reviewed by A.' })
      .expect(201);

    await assign(admin.authorization, client.id, trainerB.id);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authA)
      .expect(404);
    const byB = await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(200);
    expect(byB.body.review.reviewedByUserId).toBe(trainerA.user.id);
    expect(byB.body.review.feedback).toBe('Reviewed by A.');

    const overwrite = await request(http)
      .patch(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', authB)
      .send({ feedback: 'Overwrite by B' })
      .expect(409);
    expect(overwrite.body.message).toBe(
      'Review belongs to a different reviewer',
    );

    const unchanged = await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(200);
    expect(unchanged.body.review.feedback).toBe('Reviewed by A.');
  });

  it('enforces exact period uniqueness in the API and PostgreSQL', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({ periodStart: '2026-08-24', periodEnd: '2026-08-30' })
      .expect(201);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({ periodStart: '2026-08-24', periodEnd: '2026-08-30' })
      .expect(409);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({ periodStart: '2026-08-25', periodEnd: '2026-08-31' })
      .expect(201);

    const checkIns = dataSource.getRepository(CheckIn);
    try {
      await checkIns.save(
        checkIns.create({
          clientProfileId: client.id,
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          status: CheckInStatus.DRAFT,
        }),
      );
      throw new Error('expected unique period constraint');
    } catch (error) {
      expect(isPostgresUniqueViolation(error)).toBe(true);
    }
  });

  it('validates ratings, adherence, period length, and mass assignment', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        sleepQuality: 0,
      })
      .expect(400);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        energyLevel: 6,
      })
      .expect(400);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        stressLevel: -1,
      })
      .expect(400);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        trainingAdherencePct: -1,
      })
      .expect(400);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        nutritionAdherencePct: 101,
      })
      .expect(400);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-01',
        periodEnd: '2026-09-02',
      })
      .expect(400);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-01',
        periodEnd: '2026-09-01',
        sleepQuality: 1,
        energyLevel: 5,
        trainingAdherencePct: 0,
        nutritionAdherencePct: 100,
        clientProfileId: client.id,
        status: 'SUBMITTED',
        submittedAt: '2026-08-01T00:00:00.000Z',
        trainerId: randomUUID(),
        reviewedByUserId: randomUUID(),
        id: randomUUID(),
      })
      .expect(400);

    const ok = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-01',
        periodEnd: '2026-09-01',
        sleepQuality: 1,
        energyLevel: 5,
        trainingAdherencePct: 0,
        nutritionAdherencePct: 100,
      })
      .expect(201);
    expect(ok.body.status).toBe('DRAFT');
    expect(ok.body.responses.trainingAdherencePct).toBe(0);
  });

  it('hides foreign Client and unassigned Trainer access as not found', async () => {
    const admin = await createAdmin();
    const clientA = await provisionClient(admin.authorization);
    const clientB = await provisionClient(admin.authorization, {
      email: 'client-b@example.com',
      firstName: 'Bea',
    });
    const trainer = await provisionTrainer(admin.authorization);
    await assign(admin.authorization, clientA.id, trainer.id);
    const authA = await authHeader(clientA.user.email);
    const authB = await authHeader(clientB.user.email);
    const trainerAuth = await authHeader(trainer.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', authA)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        hungerLevel: 3,
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', authA)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(404);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .send({ hungerLevel: 1 })
      .expect(404);
    await request(http)
      .delete(`/api/v1/clients/me/check-ins/${checkInId}`)
      .set('Authorization', authB)
      .expect(404);

    await request(http)
      .get(`/api/v1/clients/${clientB.id}/check-ins/${checkInId}`)
      .set('Authorization', trainerAuth)
      .expect(404);

    await request(http)
      .post(`/api/v1/clients/${clientB.id}/check-ins/${checkInId}/review`)
      .set('Authorization', trainerAuth)
      .send({ feedback: 'nope' })
      .expect(404);
  });

  it('keeps ADMIN read-only and rejects CLIENT/ADMIN review mutations', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainer = await provisionTrainer(admin.authorization);
    await assign(admin.authorization, client.id, trainer.id);
    const clientAuth = await authHeader(client.user.email);
    const trainerAuth = await authHeader(trainer.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        generalNotes: 'Ready.',
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/${client.id}/check-ins/${checkInId}`)
      .set('Authorization', admin.authorization)
      .expect(200);

    await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', admin.authorization)
      .send({ feedback: 'Admin review' })
      .expect(403);
    await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', clientAuth)
      .send({ feedback: 'Client review' })
      .expect(403);

    await request(http)
      .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', trainerAuth)
      .send({ feedback: 'Trainer review' })
      .expect(201);

    await request(http)
      .patch(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', admin.authorization)
      .send({ feedback: 'Admin edit' })
      .expect(403);
    await request(http)
      .patch(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
      .set('Authorization', clientAuth)
      .send({ feedback: 'Client edit' })
      .expect(403);

    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', admin.authorization)
      .send({ periodStart: '2026-09-01', periodEnd: '2026-09-07' })
      .expect(403);
    await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', trainerAuth)
      .send({ periodStart: '2026-09-01', periodEnd: '2026-09-07' })
      .expect(403);
    await request(http).get('/api/v1/clients/me/check-ins').expect(401);
  });

  it('treats /clients/me as a static CLIENT route for ADMIN and TRAINER', async () => {
    const admin = await createAdmin();
    const trainer = await provisionTrainer(admin.authorization);
    const trainerAuth = await authHeader(trainer.user.email);

    await request(http)
      .get('/api/v1/clients/me/check-ins')
      .set('Authorization', admin.authorization)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/check-ins')
      .set('Authorization', trainerAuth)
      .expect(403);
  });
});
