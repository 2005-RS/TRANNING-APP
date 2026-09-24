import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import {
  isPostgresCheckViolation,
  isPostgresForeignKeyViolation,
  isPostgresInvalidEnum,
  isPostgresUniqueViolation,
} from '../src/database/postgres-errors';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../src/modules/exercises/enums/exercise-status.enum';
import { Exercise } from '../src/modules/exercises/entities/exercise.entity';
import { ExerciseMedia } from '../src/modules/exercises/media/entities/exercise-media.entity';
import { ExerciseMediaStatus } from '../src/modules/exercises/media/enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../src/modules/exercises/media/enums/exercise-media-type.enum';
import { EXERCISE_MEDIA_MAX_VIDEOS } from '../src/modules/exercises/media/exercise-media.constants';
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

function assertNoSecrets(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toContain('passwordHash');
  expect(raw).not.toContain('refreshTokenDigest');
  expect(raw).not.toMatch(/secretAccessKey/i);
  expect(raw).not.toMatch(/"password"\s*:/);
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

describe('Exercise media (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let exercises: Repository<Exercise>;
  let media: Repository<ExerciseMedia>;
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
    exercises = dataSource.getRepository(Exercise);
    media = dataSource.getRepository(ExerciseMedia);
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

  function catalogBody(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Barbell Bench Press',
      description: 'A horizontal barbell press.',
      instructions: 'Unrack.\nLower to the chest.\nPress up.',
      primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
      equipmentType: ExerciseEquipmentType.BARBELL,
      difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      ...overrides,
    };
  }

  function uploadBody(overrides: Record<string, unknown> = {}) {
    return {
      mediaType: ExerciseMediaType.VIDEO,
      fileName: 'bench.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 2048,
      ...overrides,
    };
  }

  async function createExercise(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const created = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', authorization)
      .send(catalogBody(overrides))
      .expect(201);
    return readId(created.body);
  }

  describe('initiation and authorization', () => {
    it('lets ADMIN and owning TRAINER initiate uploads and rejects others', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await createUser({
        email: 'client@example.com',
        role: UserRole.CLIENT,
        firstName: 'Cara',
        lastName: 'Client',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const clientAuth = await authHeader(client.email);
      const exerciseId = await createExercise(trainerAAuth);

      const adminUpload = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', authorization)
        .send(uploadBody({ fileName: 'admin.mp4' }))
        .expect(201);
      expect(adminUpload.body.media.status).toBe(
        ExerciseMediaStatus.PENDING_UPLOAD,
      );
      expect(adminUpload.body.media).not.toHaveProperty('storageKey');
      expect(adminUpload.body.upload.method).toBe('POST');
      expect(adminUpload.body.upload.fields.key).toMatch(
        new RegExp(`^exercises/${exerciseId}/`),
      );
      assertNoSecrets(adminUpload.body);

      const ownerUpload = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAAuth)
        .send(uploadBody({ fileName: '../../stolen.mp4' }))
        .expect(201);
      expect(ownerUpload.body.media.originalFileName).toBe('stolen.mp4');
      expect(ownerUpload.body.upload.fields.key).not.toContain('stolen');
      expect(ownerUpload.body.upload.fields.key).not.toContain('..');

      const firstKey = adminUpload.body.upload.fields.key as string;
      const secondKey = ownerUpload.body.upload.fields.key as string;
      expect(firstKey).not.toBe(secondKey);

      const listedForB = await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(listedForB.body).toHaveLength(2);
      expect(listedForB.body[0]).not.toHaveProperty('storageKey');

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerBAuth)
        .send(uploadBody())
        .expect(404);

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', clientAuth)
        .send(uploadBody())
        .expect(403);

      await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media`)
        .set('Authorization', clientAuth)
        .expect(403);

      await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media/${randomUUID()}/access`)
        .set('Authorization', clientAuth)
        .expect(404);

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .send(uploadBody())
        .expect(401);

      await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media`)
        .expect(401);

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAAuth)
        .send(
          uploadBody({
            storageKey: 'evil',
            status: ExerciseMediaStatus.READY,
            createdByUserId: trainerB.user.id,
            finalizedAt: new Date().toISOString(),
            bucket: 'other',
          }),
        )
        .expect(400);
    });

    it('rejects archived exercises, invalid MIME, and oversized declarations', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth, {
        name: 'Paused Press',
      });

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody())
        .expect(409);
      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', authorization)
        .send(uploadBody())
        .expect(409);

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ACTIVE })
        .expect(200);

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ mimeType: 'application/octet-stream' }))
        .expect(400);
      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ mimeType: 'image/svg+xml' }))
        .expect(400);

      const oversized = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ fileSizeBytes: 262144001 }))
        .expect(413);
      expect(oversized.body.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('finalization, access, delete, and limits', () => {
    it('finalizes a valid object, rejects bad objects, and is idempotent when READY', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);

      const initiated = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody())
        .expect(201);
      const mediaId = initiated.body.media.id as string;
      const row = await media.findOneByOrFail({ id: mediaId });

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${mediaId}/finalize`)
        .set('Authorization', trainerAuth)
        .expect(409);
      expect((await media.findOneByOrFail({ id: mediaId })).status).toBe(
        ExerciseMediaStatus.PENDING_UPLOAD,
      );

      await putTestObject(storage, {
        key: row.storageKey,
        contentType: 'image/png',
        contentLength: 2048,
      });
      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${mediaId}/finalize`)
        .set('Authorization', trainerAuth)
        .expect(400);
      expect((await media.findOneByOrFail({ id: mediaId })).status).toBe(
        ExerciseMediaStatus.FAILED,
      );
      expect(await storage.headObject(row.storageKey)).toBeNull();

      const valid = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ fileName: 'valid.mp4' }))
        .expect(201);
      const validId = valid.body.media.id as string;
      const validRow = await media.findOneByOrFail({ id: validId });
      await putTestObject(storage, {
        key: validRow.storageKey,
        contentType: 'video/mp4',
        contentLength: 4096,
      });
      const finalized = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${validId}/finalize`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(finalized.body.status).toBe(ExerciseMediaStatus.READY);
      expect(finalized.body.fileSizeBytes).toBe(4096);
      expect(finalized.body).not.toHaveProperty('storageKey');

      const again = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${validId}/finalize`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(again.body.status).toBe(ExerciseMediaStatus.READY);

      const oversizedInit = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ fileName: 'huge.mp4' }))
        .expect(201);
      const hugeId = oversizedInit.body.media.id as string;
      const hugeRow = await media.findOneByOrFail({ id: hugeId });
      await putTestObject(storage, {
        key: hugeRow.storageKey,
        contentType: 'video/mp4',
        contentLength: 262144001,
      });
      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${hugeId}/finalize`)
        .set('Authorization', trainerAuth)
        .expect(413);

      const access = await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media/${validId}/access`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(access.body.url).toEqual(expect.any(String));
      expect(access.body.expiresAt).toEqual(expect.any(String));
      assertNoSecrets(access.body);
    });

    it('lets ADMIN manage another trainer media, blocks trainer B mutations, and deletes object plus metadata', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const exerciseId = await createExercise(trainerAAuth, {
        name: 'Shared Press',
      });

      const initiated = await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAAuth)
        .send(uploadBody())
        .expect(201);
      const mediaId = initiated.body.media.id as string;
      const row = await media.findOneByOrFail({ id: mediaId });
      await putTestObject(storage, {
        key: row.storageKey,
        contentType: 'video/mp4',
        contentLength: 1024,
      });
      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/${mediaId}/finalize`)
        .set('Authorization', authorization)
        .expect(200);

      await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media/${mediaId}/access`)
        .set('Authorization', trainerBAuth)
        .expect(200);

      await request(http)
        .delete(`/api/v1/exercises/${exerciseId}/media/${mediaId}`)
        .set('Authorization', trainerBAuth)
        .expect(404);

      await request(http)
        .delete(`/api/v1/exercises/${exerciseId}/media/${mediaId}`)
        .set('Authorization', authorization)
        .expect(204);
      expect(await storage.headObject(row.storageKey)).toBeNull();
      expect(await media.findOneBy({ id: mediaId })).toBeNull();

      const listed = await request(http)
        .get(`/api/v1/exercises/${exerciseId}/media`)
        .set('Authorization', trainerAAuth)
        .expect(200);
      expect(listed.body).toHaveLength(0);

      await request(http)
        .delete(`/api/v1/exercises/${exerciseId}/media/${mediaId}`)
        .set('Authorization', trainerAAuth)
        .expect(404);
    });

    it('counts PENDING and READY videos toward the per-exercise limit', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth, {
        name: 'Limit Press',
      });

      for (let index = 0; index < EXERCISE_MEDIA_MAX_VIDEOS; index += 1) {
        await request(http)
          .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
          .set('Authorization', trainerAuth)
          .send(uploadBody({ fileName: `clip-${index}.mp4` }))
          .expect(201);
      }

      await request(http)
        .post(`/api/v1/exercises/${exerciseId}/media/upload-requests`)
        .set('Authorization', trainerAuth)
        .send(uploadBody({ fileName: 'too-many.mp4' }))
        .expect(409);
    });
  });

  describe('database integrity', () => {
    it('enforces foreign keys, uniqueness, enums, and CHECK constraints', async () => {
      const { user: admin } = await createAdmin();
      const exercise = await exercises.save(
        exercises.create({
          name: 'Integrity Press',
          primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
          equipmentType: ExerciseEquipmentType.BARBELL,
          difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
          status: ExerciseStatus.ACTIVE,
          createdByUserId: admin.id,
        }),
      );

      try {
        await media.save(
          media.create({
            exerciseId: randomUUID(),
            mediaType: ExerciseMediaType.VIDEO,
            storageKey: `exercises/${randomUUID()}/missing.mp4`,
            originalFileName: 'missing.mp4',
            mimeType: 'video/mp4',
            status: ExerciseMediaStatus.PENDING_UPLOAD,
            displayOrder: 0,
            createdByUserId: admin.id,
          }),
        );
        throw new Error('expected missing exercise FK to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await media.save(
          media.create({
            exerciseId: exercise.id,
            mediaType: ExerciseMediaType.VIDEO,
            storageKey: `exercises/${exercise.id}/ghost.mp4`,
            originalFileName: 'ghost.mp4',
            mimeType: 'video/mp4',
            status: ExerciseMediaStatus.PENDING_UPLOAD,
            displayOrder: 0,
            createdByUserId: randomUUID(),
          }),
        );
        throw new Error('expected missing creator FK to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      await media.save(
        media.create({
          exerciseId: exercise.id,
          mediaType: ExerciseMediaType.VIDEO,
          storageKey: `exercises/${exercise.id}/one.mp4`,
          originalFileName: 'one.mp4',
          mimeType: 'video/mp4',
          status: ExerciseMediaStatus.PENDING_UPLOAD,
          displayOrder: 0,
          createdByUserId: admin.id,
        }),
      );

      try {
        await media.save(
          media.create({
            exerciseId: exercise.id,
            mediaType: ExerciseMediaType.VIDEO,
            storageKey: `exercises/${exercise.id}/one.mp4`,
            originalFileName: 'dup.mp4',
            mimeType: 'video/mp4',
            status: ExerciseMediaStatus.PENDING_UPLOAD,
            displayOrder: 1,
            createdByUserId: admin.id,
          }),
        );
        throw new Error('expected unique storage key to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercise_media (
            exercise_id, media_type, storage_key, mime_type, status, display_order, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            exercise.id,
            'AUDIO',
            `exercises/${exercise.id}/audio.mp3`,
            'audio/mpeg',
            ExerciseMediaStatus.PENDING_UPLOAD,
            0,
            admin.id,
          ],
        );
        throw new Error('expected invalid media type to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercise_media (
            exercise_id, media_type, storage_key, mime_type, status, display_order, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            exercise.id,
            ExerciseMediaType.VIDEO,
            `exercises/${exercise.id}/bad-status.mp4`,
            'video/mp4',
            'UPLOADED',
            0,
            admin.id,
          ],
        );
        throw new Error('expected invalid status to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercise_media (
            exercise_id, media_type, storage_key, mime_type, status, display_order, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            exercise.id,
            ExerciseMediaType.VIDEO,
            `exercises/${exercise.id}/neg.mp4`,
            'video/mp4',
            ExerciseMediaStatus.PENDING_UPLOAD,
            -1,
            admin.id,
          ],
        );
        throw new Error('expected display order CHECK to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercise_media (
            exercise_id, media_type, storage_key, mime_type, file_size_bytes, status, display_order, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            exercise.id,
            ExerciseMediaType.VIDEO,
            `exercises/${exercise.id}/zero.mp4`,
            'video/mp4',
            0,
            ExerciseMediaStatus.PENDING_UPLOAD,
            0,
            admin.id,
          ],
        );
        throw new Error('expected file size CHECK to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercise_media (
            exercise_id, media_type, storage_key, mime_type, status, display_order, created_by_user_id, finalized_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            exercise.id,
            ExerciseMediaType.VIDEO,
            `exercises/${exercise.id}/ready-null.mp4`,
            'video/mp4',
            ExerciseMediaStatus.READY,
            0,
            admin.id,
            null,
          ],
        );
        throw new Error('expected READY finalized_at CHECK to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }
    });
  });
});
