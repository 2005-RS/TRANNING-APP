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
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { ExerciseMedia } from '../src/modules/exercises/media/entities/exercise-media.entity';
import { ExerciseMediaStatus } from '../src/modules/exercises/media/enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../src/modules/exercises/media/enums/exercise-media-type.enum';
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

describe('Exercise media MinIO smoke (e2e)', () => {
  jest.setTimeout(90_000);
  let app: INestApplication | undefined;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let mediaRows: Repository<ExerciseMedia>;
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
    mediaRows = dataSource.getRepository(ExerciseMedia);
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
        email: 'admin-media-minio@example.com',
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

    const exercise = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', adminAuth)
      .send({
        name: 'MinIO Bench',
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      })
      .expect(201);
    const exerciseId = readId(exercise.body);

    const created = await request(http)
      .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
      .set('Authorization', adminAuth)
      .send({
        mediaType: ExerciseMediaType.IMAGE,
        fileName: 'cue.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: TINY_JPEG.length,
      })
      .expect(201);

    const mediaId = created.body.media.id as string;
    const fields = created.body.upload.fields as Record<string, string>;
    const uploadUrl = created.body.upload.url as string;
    expect(fields.key).toMatch(new RegExp(`^exercises/${exerciseId}/`));
    expect(fields.key).not.toContain('cue.jpg');

    const mutated = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      mutated.append(key, key === 'key' ? `${value}-tampered` : value);
    }
    mutated.append(
      'file',
      new Blob([TINY_JPEG], { type: 'image/jpeg' }),
      'cue.jpg',
    );
    const mutatedResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: mutated,
    });
    expect(mutatedResponse.ok).toBe(false);

    const valid = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      valid.append(key, value);
    }
    valid.append(
      'file',
      new Blob([TINY_JPEG], { type: 'image/jpeg' }),
      'cue.jpg',
    );
    const uploaded = await fetch(uploadUrl, { method: 'POST', body: valid });
    expect(uploaded.ok).toBe(true);

    const finalized = await request(http)
      .post(`/api/v1/exercises/${exerciseId}/media/${mediaId}/finalize`)
      .set('Authorization', adminAuth)
      .expect(200);
    expect(finalized.body.status).toBe(ExerciseMediaStatus.READY);
    expect(JSON.stringify(finalized.body)).not.toContain('storageKey');

    const row = await mediaRows.findOneByOrFail({ id: mediaId });
    const headed = await storage.headObject(row.storageKey);
    expect(headed).not.toBeNull();

    const access = await request(http)
      .get(`/api/v1/exercises/${exerciseId}/media/${mediaId}/access`)
      .set('Authorization', adminAuth)
      .expect(200);
    const signedGet = await fetch(access.body.url as string);
    expect(signedGet.ok).toBe(true);

    const unsignedUrl = (access.body.url as string).split('?')[0];
    const unsigned = await fetch(unsignedUrl);
    expect(unsigned.status).toBeGreaterThanOrEqual(400);

    await request(http)
      .delete(`/api/v1/exercises/${exerciseId}/media/${mediaId}`)
      .set('Authorization', adminAuth)
      .expect(204);
    expect(await mediaRows.findOneBy({ id: mediaId })).toBeNull();
    expect(await storage.headObject(row.storageKey)).toBeNull();
  });
});
