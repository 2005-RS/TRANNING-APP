import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { BodyMeasurement } from '../src/modules/body-measurements/entities/body-measurement.entity';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ProgressPhoto } from '../src/modules/progress-photos/entities/progress-photo.entity';
import { ProgressPhotoPose } from '../src/modules/progress-photos/enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from '../src/modules/progress-photos/enums/progress-photo-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { OBJECT_STORAGE } from '../src/storage/object-storage.tokens';
import { ObjectStorageService } from '../src/storage/object-storage.types';
import {
  asWritableTestStorage,
  putTestObject,
} from '../src/storage/test-object-storage';
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

function assertNoSecrets(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toContain('storageKey');
  expect(raw).not.toContain('passwordHash');
  expect(raw).not.toMatch(/secretAccessKey/i);
}

describe('Progress photos (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let photos: Repository<ProgressPhoto>;
  let hasher: PasswordHasherService;
  let storage: ObjectStorageService;

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
    photos = dataSource.getRepository(ProgressPhoto);
    hasher = app.get(PasswordHasherService);
    storage = app.get<ObjectStorageService>(OBJECT_STORAGE);
  });

  beforeEach(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);
    asWritableTestStorage(storage).clear();
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

  function requestUpload(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    return request(http)
      .post('/api/v1/clients/me/progress-photos/upload-requests')
      .set('Authorization', authorization)
      .send({
        originalFileName: 'front.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2500,
        pose: ProgressPhotoPose.FRONT,
        ...overrides,
      });
  }

  it('creates a JPEG upload request for CLIENT only with a server-controlled key', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const clientAuth = await authHeader(client.user.email);
    const trainer = await provisionTrainer(admin.authorization);
    const trainerAuth = await authHeader(trainer.user.email);

    const created = await requestUpload(clientAuth).expect(201);
    assertNoSecrets(created.body);
    expect(created.body.photo.status).toBe(ProgressPhotoStatus.PENDING_UPLOAD);
    expect(created.body.photo).not.toHaveProperty('originalFileName');
    expect(created.body.upload.method).toBe('POST');
    expect(created.body.upload.fields.key).toMatch(
      new RegExp(`^progress-photos/${client.id}/`),
    );
    expect(created.body.upload.fields.key).not.toContain('client@example.com');
    expect(created.body.upload.fields.key).not.toContain('Cara');
    expect(created.body.upload.fields.key).not.toContain('front.jpg');
    const expiresAt = new Date(
      created.body.upload.expiresAt as string,
    ).getTime();
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);

    await requestUpload(trainerAuth).expect(403);
    await requestUpload(admin.authorization).expect(403);

    await requestUpload(clientAuth, {
      storageKey: 'evil',
      status: ProgressPhotoStatus.READY,
      signedUrl: 'http://example',
      clientProfileId: client.id,
      userId: client.user.id,
      trainerId: trainer.id,
      finalizedAt: new Date().toISOString(),
      bucket: 'public',
    }).expect(400);
  });

  it('finalizes via HEAD, lists READY by default, signs access, and deletes', async () => {
    const admin = await createAdmin();
    const client = await provisionClient(admin.authorization);
    const other = await provisionClient(admin.authorization, {
      email: 'client-b@example.com',
      firstName: 'Bea',
    });
    const clientAuth = await authHeader(client.user.email);
    const otherAuth = await authHeader(other.user.email);

    const missingReq = await requestUpload(clientAuth).expect(201);
    const missingId = readId(missingReq.body.photo);
    await request(http)
      .post(`/api/v1/clients/me/progress-photos/${missingId}/finalize`)
      .set('Authorization', clientAuth)
      .expect(409);
    const stillPending = await photos.findOneByOrFail({ id: missingId });
    expect(stillPending.status).toBe(ProgressPhotoStatus.PENDING_UPLOAD);

    const badReq = await requestUpload(clientAuth).expect(201);
    const badId = readId(badReq.body.photo);
    const badRow = await photos.findOneByOrFail({ id: badId });
    await putTestObject(storage, {
      key: badRow.storageKey,
      contentType: 'image/png',
      contentLength: 2048,
    });
    await request(http)
      .post(`/api/v1/clients/me/progress-photos/${badId}/finalize`)
      .set('Authorization', clientAuth)
      .expect(400);
    const failed = await photos.findOneByOrFail({ id: badId });
    expect(failed.status).toBe(ProgressPhotoStatus.FAILED);

    const validReq = await requestUpload(clientAuth, {
      pose: ProgressPhotoPose.SIDE,
    }).expect(201);
    const photoId = readId(validReq.body.photo);
    const validRow = await photos.findOneByOrFail({ id: photoId });
    await putTestObject(storage, {
      key: validRow.storageKey,
      contentType: 'image/jpeg',
      contentLength: 4096,
    });
    const finalized = await request(http)
      .post(`/api/v1/clients/me/progress-photos/${photoId}/finalize`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(finalized.body.status).toBe(ProgressPhotoStatus.READY);
    expect(finalized.body.fileSizeBytes).toBe(4096);
    assertNoSecrets(finalized.body);

    const listed = await request(http)
      .get('/api/v1/clients/me/progress-photos')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].id).toBe(photoId);

    const pendingListed = await request(http)
      .get('/api/v1/clients/me/progress-photos?status=PENDING_UPLOAD')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(
      pendingListed.body.data.map((row: { id: string }) => row.id),
    ).toEqual([missingId]);

    const access = await request(http)
      .get(`/api/v1/clients/me/progress-photos/${photoId}/access`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(access.body.url).toBeTruthy();
    expect(access.body).not.toHaveProperty('storageKey');

    await request(http)
      .get(`/api/v1/clients/me/progress-photos/${photoId}`)
      .set('Authorization', otherAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/me/progress-photos/${photoId}/access`)
      .set('Authorization', otherAuth)
      .expect(404);

    await request(http)
      .delete(`/api/v1/clients/me/progress-photos/${photoId}`)
      .set('Authorization', clientAuth)
      .expect(204);
    expect(await photos.findOneBy({ id: photoId })).toBeNull();
    expect(await storage.headObject(validRow.storageKey)).toBeNull();
    await request(http)
      .get(`/api/v1/clients/me/progress-photos/${photoId}/access`)
      .set('Authorization', clientAuth)
      .expect(404);
    await request(http)
      .delete(`/api/v1/clients/me/progress-photos/${photoId}`)
      .set('Authorization', clientAuth)
      .expect(404);
  });

  it('links photos to owned measurements only and hides pending from management', async () => {
    const admin = await createAdmin();
    const clientA = await provisionClient(admin.authorization);
    const clientB = await provisionClient(admin.authorization, {
      email: 'client-b@example.com',
      firstName: 'Bea',
    });
    const trainerA = await provisionTrainer(admin.authorization);
    const trainerB = await provisionTrainer(admin.authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const authA = await authHeader(clientA.user.email);
    const authB = await authHeader(clientB.user.email);
    const trainerAuthA = await authHeader(trainerA.user.email);
    const trainerAuthB = await authHeader(trainerB.user.email);
    await assign(admin.authorization, clientA.id, trainerA.id);

    const measurementA = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', authA)
      .send({ bodyWeightKg: 80 })
      .expect(201);
    const measurementB = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', authB)
      .send({ bodyWeightKg: 70 })
      .expect(201);

    await requestUpload(authA, {
      bodyMeasurementId: measurementB.body.id,
    }).expect(404);

    const linked = await requestUpload(authA, {
      bodyMeasurementId: measurementA.body.id,
    }).expect(201);
    const photoId = readId(linked.body.photo);
    const row = await photos.findOneByOrFail({ id: photoId });
    await putTestObject(storage, {
      key: row.storageKey,
      contentType: 'image/jpeg',
      contentLength: 1024,
    });
    await request(http)
      .post(`/api/v1/clients/me/progress-photos/${photoId}/finalize`)
      .set('Authorization', authA)
      .expect(200);

    const managed = await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos`)
      .set('Authorization', trainerAuthA)
      .expect(200);
    expect(managed.body.data).toHaveLength(1);
    expect(managed.body.data[0].bodyMeasurementId).toBe(measurementA.body.id);
    assertNoSecrets(managed.body);

    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos/${photoId}/access`)
      .set('Authorization', trainerAuthA)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos`)
      .set('Authorization', trainerAuthB)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos/${photoId}/access`)
      .set('Authorization', admin.authorization)
      .expect(200);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos`)
      .set('Authorization', authA)
      .expect(403);
    await request(http)
      .delete(`/api/v1/clients/${clientA.id}/progress-photos/${photoId}`)
      .set('Authorization', trainerAuthA)
      .expect(404);

    await assign(admin.authorization, clientA.id, trainerB.id);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos/${photoId}/access`)
      .set('Authorization', trainerAuthA)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos/${photoId}/access`)
      .set('Authorization', trainerAuthB)
      .expect(200);

    await request(http)
      .get('/api/v1/clients/me/progress-photos')
      .set('Authorization', admin.authorization)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/progress-photos')
      .set('Authorization', trainerAuthA)
      .expect(403);

    const measurements = dataSource.getRepository(BodyMeasurement);
    expect(
      await measurements.findOneBy({ id: measurementA.body.id as string }),
    ).toBeTruthy();
  });
});
