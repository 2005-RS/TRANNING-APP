import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
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

describe('Body measurements (e2e)', () => {
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

  it('lets a Client create, list, detail, and patch measurements without a training plan', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    const created = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({
        bodyWeightKg: 82.5,
        waistCm: 85,
        measuredAt: '2026-08-01T08:00:00.000Z',
      })
      .expect(201);

    expect(created.body.bodyWeightKg).toBe(82.5);
    expect(created.body.waistCm).toBe(85);
    expect(typeof created.body.bodyWeightKg).toBe('number');
    expect(created.body).not.toHaveProperty('clientProfileId');

    const listed = await request(http)
      .get('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.meta.page).toBe(1);

    const detail = await request(http)
      .get(`/api/v1/clients/me/body-measurements/${created.body.id as string}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(detail.body.id).toBe(created.body.id);

    const patched = await request(http)
      .patch(
        `/api/v1/clients/me/body-measurements/${created.body.id as string}`,
      )
      .set('Authorization', clientAuth)
      .send({ bodyWeightKg: 81.8 })
      .expect(200);
    expect(patched.body.bodyWeightKg).toBe(81.8);
    expect(patched.body.waistCm).toBe(85);

    await request(http)
      .patch(
        `/api/v1/clients/me/body-measurements/${created.body.id as string}`,
      )
      .set('Authorization', clientAuth)
      .send({
        bodyWeightKg: null,
        waistCm: null,
      })
      .expect(400);
  });

  it('rejects notes-only, mass assignment, and foreign access', async () => {
    const admin = await createAdmin();
    const clientA = await provisionClient(admin.authorization);
    const clientB = await provisionClient(admin.authorization, {
      email: 'client-b@example.com',
      firstName: 'Bea',
    });
    const authA = await authHeader(clientA.user.email);
    const authB = await authHeader(clientB.user.email);
    const trainer = await provisionTrainer(admin.authorization);
    const trainerAuth = await authHeader(trainer.user.email);

    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', authA)
      .send({ notes: 'hello' })
      .expect(400);

    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', authA)
      .send({
        bodyWeightKg: 80,
        clientProfileId: clientB.id,
        id: randomUUID(),
        createdAt: '2020-01-01T00:00:00.000Z',
        trainerId: trainer.id,
        userId: clientA.user.id,
      })
      .expect(400);

    const created = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', authA)
      .send({ bodyWeightKg: 80 })
      .expect(201);
    const measurementId = readId(created.body);

    await request(http)
      .get(`/api/v1/clients/me/body-measurements/${measurementId}`)
      .set('Authorization', authB)
      .expect(404);

    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', trainerAuth)
      .send({ bodyWeightKg: 80 })
      .expect(403);

    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', admin.authorization)
      .send({ bodyWeightKg: 80 })
      .expect(403);

    await request(http)
      .get(`/api/v1/clients/${clientA.id}/body-measurements`)
      .set('Authorization', authA)
      .expect(403);

    await request(http).get('/api/v1/clients/me/body-measurements').expect(401);

    await request(http)
      .get('/api/v1/clients/me/body-measurements/not-a-uuid')
      .set('Authorization', authA)
      .expect(400);
  });

  it('orders bodyweight history, paginates, and filters by date', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);

    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({
        bodyWeightKg: 82.5,
        measuredAt: '2026-08-01T08:00:00.000Z',
      })
      .expect(201);
    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({
        bodyWeightKg: 81.9,
        measuredAt: '2026-08-08T08:00:00.000Z',
      })
      .expect(201);
    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({
        bodyWeightKg: 81.4,
        measuredAt: '2026-08-15T08:00:00.000Z',
      })
      .expect(201);
    await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({
        waistCm: 84,
        measuredAt: '2026-08-20T08:00:00.000Z',
      })
      .expect(201);

    const listed = await request(http)
      .get('/api/v1/clients/me/body-measurements?hasBodyWeight=true')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(
      listed.body.data.map((row: { bodyWeightKg: number }) => row.bodyWeightKg),
    ).toEqual([81.4, 81.9, 82.5]);

    const page = await request(http)
      .get(
        '/api/v1/clients/me/body-measurements?hasBodyWeight=true&page=1&limit=2',
      )
      .set('Authorization', clientAuth)
      .expect(200);
    expect(page.body.data).toHaveLength(2);
    expect(page.body.meta.totalItems).toBe(3);
    expect(page.body.data[0].bodyWeightKg).toBe(81.4);

    const filtered = await request(http)
      .get(
        '/api/v1/clients/me/body-measurements?dateFrom=2026-08-08&dateTo=2026-08-08&hasBodyWeight=true',
      )
      .set('Authorization', clientAuth)
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].bodyWeightKg).toBe(81.9);

    await request(http)
      .get(
        '/api/v1/clients/me/body-measurements?dateFrom=2026-08-10&dateTo=2026-08-01',
      )
      .set('Authorization', clientAuth)
      .expect(400);
  });

  it('follows current trainer assignment for measurement reads using existing JWTs', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const trainerA = await provisionTrainer(admin.authorization);
    const trainerB = await provisionTrainer(admin.authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const clientAuth = await authHeader(client.user.email);
    const authA = await authHeader(trainerA.user.email);
    const authB = await authHeader(trainerB.user.email);

    await assign(admin.authorization, client.id, trainerA.id);
    const created = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientAuth)
      .send({ bodyWeightKg: 82.5, waistCm: 85 })
      .expect(201);
    const measurementId = readId(created.body);

    await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements`)
      .set('Authorization', authA)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements/${measurementId}`)
      .set('Authorization', authA)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements`)
      .set('Authorization', authB)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements`)
      .set('Authorization', admin.authorization)
      .expect(200);

    await assign(admin.authorization, client.id, trainerB.id);

    await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements/${measurementId}`)
      .set('Authorization', authA)
      .expect(404);
    const after = await request(http)
      .get(`/api/v1/clients/${client.id}/body-measurements/${measurementId}`)
      .set('Authorization', authB)
      .expect(200);
    expect(after.body.bodyWeightKg).toBe(82.5);
    expect(after.body.waistCm).toBe(85);
  });

  it('treats /clients/me as a static CLIENT route for ADMIN and TRAINER', async () => {
    const admin = await createAdmin();
    const trainer = await provisionTrainer(admin.authorization);
    const trainerAuth = await authHeader(trainer.user.email);

    await request(http)
      .get('/api/v1/clients/me/body-measurements')
      .set('Authorization', admin.authorization)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/body-measurements')
      .set('Authorization', trainerAuth)
      .expect(403);
  });
});
