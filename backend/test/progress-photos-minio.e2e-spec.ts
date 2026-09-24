import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { EnvironmentVariables } from '../src/config/env.validation';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
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
import { clearIdentityGraph } from './helpers/clear-identity-graph';

loadEnv({ path: resolve(__dirname, '..', '.env') });
process.env.DATABASE_NAME = 'training_test';
process.env.NODE_ENV = 'test';

const COOKIE = 'refresh_session';
const PASSWORD = 'correct horse battery';
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//Z',
  'base64',
);

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

async function minioReachable(): Promise<boolean> {
  const endpoint =
    process.env.OBJECT_STORAGE_ENDPOINT ?? 'http://localhost:9100';
  try {
    const response = await fetch(endpoint, { method: 'GET' });
    return response.status > 0;
  } catch {
    return false;
  }
}

describe('Progress photos MinIO smoke (e2e)', () => {
  jest.setTimeout(90_000);
  let app: INestApplication | undefined;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let photos: Repository<ProgressPhoto>;
  let hasher: PasswordHasherService;
  let storage: ObjectStorageService;
  let available = false;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    available = await minioReachable();
    if (!available) {
      return;
    }

    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const config = app.get(ConfigService<EnvironmentVariables, true>);
    expect(config.getOrThrow('OBJECT_STORAGE_DRIVER', { infer: true })).toBe(
      's3',
    );

    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    photos = dataSource.getRepository(ProgressPhoto);
    hasher = app.get(PasswordHasherService);
    storage = app.get<ObjectStorageService>(OBJECT_STORAGE);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  it('uploads, finalizes, reads, denies unsigned GET, and deletes against local MinIO', async () => {
    if (!available || !app) {
      pending('local MinIO is not reachable on OBJECT_STORAGE_ENDPOINT');
      return;
    }

    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);

    const admin = await users.save(
      users.create({
        email: 'admin-minio@example.com',
        passwordHash: await hasher.hash(PASSWORD),
        firstName: 'Ada',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const loginAdmin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: PASSWORD })
      .expect(200);
    const adminAuth = `Bearer ${loginAdmin.body.accessToken as string}`;
    expect(readCookie(loginAdmin, COOKIE)).toBeTruthy();

    const clientRes = await request(http)
      .post('/api/v1/clients')
      .set('Authorization', adminAuth)
      .send({
        email: 'client-minio@example.com',
        password: PASSWORD,
        firstName: 'Cara',
        lastName: 'Client',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.BEGINNER,
      })
      .expect(201);
    const clientAuthLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'client-minio@example.com', password: PASSWORD })
      .expect(200);
    const clientAuth = `Bearer ${clientAuthLogin.body.accessToken as string}`;

    const created = await request(http)
      .post('/api/v1/clients/me/progress-photos/upload-requests')
      .set('Authorization', clientAuth)
      .send({
        originalFileName: 'front.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: TINY_JPEG.length,
        pose: ProgressPhotoPose.FRONT,
      })
      .expect(201);

    const photoId = readId(created.body.photo);
    const fields = created.body.upload.fields as Record<string, string>;
    const uploadUrl = created.body.upload.url as string;
    expect(fields.key).toMatch(/^progress-photos\//);
    expect(fields.key).not.toContain('client-minio@example.com');

    const mutated = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      mutated.append(key, key === 'key' ? `${value}-tampered` : value);
    }
    mutated.append(
      'file',
      new Blob([TINY_JPEG], { type: 'image/jpeg' }),
      'front.jpg',
    );
    const mutatedResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: mutated,
    });
    expect(mutatedResponse.ok).toBe(false);

    const wrongType = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      wrongType.append(key, key === 'Content-Type' ? 'image/png' : value);
    }
    wrongType.append(
      'file',
      new Blob([TINY_JPEG], { type: 'image/png' }),
      'front.png',
    );
    const wrongTypeResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: wrongType,
    });
    expect(wrongTypeResponse.ok).toBe(false);

    const valid = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      valid.append(key, value);
    }
    valid.append(
      'file',
      new Blob([TINY_JPEG], { type: 'image/jpeg' }),
      'front.jpg',
    );
    const uploaded = await fetch(uploadUrl, { method: 'POST', body: valid });
    expect(uploaded.ok).toBe(true);

    const finalized = await request(http)
      .post(`/api/v1/clients/me/progress-photos/${photoId}/finalize`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(finalized.body.status).toBe(ProgressPhotoStatus.READY);
    expect(JSON.stringify(finalized.body)).not.toContain('storageKey');

    const row = await photos.findOneByOrFail({ id: photoId });
    const headed = await storage.headObject(row.storageKey);
    expect(headed).not.toBeNull();
    expect(headed?.contentLength).toBeGreaterThan(0);

    const listed = await request(http)
      .get('/api/v1/clients/me/progress-photos')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    const access = await request(http)
      .get(`/api/v1/clients/me/progress-photos/${photoId}/access`)
      .set('Authorization', clientAuth)
      .expect(200);
    const signedGet = await fetch(access.body.url as string);
    expect(signedGet.ok).toBe(true);

    const unsignedUrl = (access.body.url as string).split('?')[0];
    const unsigned = await fetch(unsignedUrl);
    expect(unsigned.status).toBeGreaterThanOrEqual(400);

    await request(http)
      .post('/api/v1/clients/me/progress-photos/upload-requests')
      .set('Authorization', clientAuth)
      .send({
        originalFileName: 'front.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 20_000_000,
        pose: ProgressPhotoPose.FRONT,
      })
      .expect(413);

    await request(http)
      .delete(`/api/v1/clients/me/progress-photos/${photoId}`)
      .set('Authorization', clientAuth)
      .expect(204);
    expect(await photos.findOneBy({ id: photoId })).toBeNull();
    expect(await storage.headObject(row.storageKey)).toBeNull();

    const clientId = clientRes.body.id as string;
    expect(clientId).toBeTruthy();
  });
});
