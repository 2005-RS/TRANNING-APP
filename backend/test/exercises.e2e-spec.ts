import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import {
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
import { ExercisesService } from '../src/modules/exercises/exercises.service';
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

function assertNoSecrets(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toContain('passwordHash');
  expect(raw).not.toContain('refreshTokenDigest');
  expect(raw).not.toMatch(/"password"\s*:/);
}

function readExerciseId(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof body.id !== 'string'
  ) {
    throw new Error('expected an exercise id');
  }
  return body.id;
}

describe('Exercises (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let exercises: Repository<Exercise>;
  let hasher: PasswordHasherService;
  let exercisesService: ExercisesService;

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
    hasher = app.get(PasswordHasherService);
    exercisesService = app.get(ExercisesService);
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

  describe('creation and authorization', () => {
    it('lets ADMIN and TRAINER create exercises and rejects CLIENT, anonymous, and mass assignment', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await createUser({
        email: 'client@example.com',
        role: UserRole.CLIENT,
        firstName: 'Cara',
        lastName: 'Client',
      });

      const adminCreated = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send(catalogBody({ name: 'Back Squat' }))
        .expect(201);
      expect(adminCreated.body.status).toBe(ExerciseStatus.ACTIVE);
      expect(adminCreated.body.createdByUserId).toBe(admin.id);
      expect(adminCreated.body.name).toBe('Back Squat');
      expect(adminCreated.body).not.toHaveProperty('createdByUser');
      assertNoSecrets(adminCreated.body);

      const trainerAuth = await authHeader(trainer.user.email);
      const trainerCreated = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAuth)
        .send(catalogBody({ name: '  Dumbbell   Bench Press  ' }))
        .expect(201);
      expect(trainerCreated.body.name).toBe('Dumbbell Bench Press');
      expect(trainerCreated.body.createdByUserId).toBe(trainer.user.id);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', await authHeader(client.email))
        .send(catalogBody())
        .expect(403);

      await request(http)
        .post('/api/v1/exercises')
        .send(catalogBody())
        .expect(401);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send({
          ...catalogBody({ name: 'Lat Pulldown' }),
          createdByUserId: randomUUID(),
          status: ExerciseStatus.ARCHIVED,
        })
        .expect(400);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send(catalogBody({ name: '' }))
        .expect(400);
      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send(catalogBody({ primaryMuscleGroup: 'NECK' }))
        .expect(400);
      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send(catalogBody({ equipmentType: 'SMITH' }))
        .expect(400);
      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', authorization)
        .send(catalogBody({ difficultyLevel: 'ELITE' }))
        .expect(400);
    });

    it('rejects a duplicate normalized name for the same creator and allows it for another creator', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAAuth)
        .send(catalogBody({ name: 'Cable Row' }))
        .expect(201);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAAuth)
        .send(catalogBody({ name: 'cable   row' }))
        .expect(409);

      await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerBAuth)
        .send(catalogBody({ name: 'Cable Row' }))
        .expect(201);
    });
  });

  describe('list, search, filters and sort', () => {
    it('paginates, defaults to ACTIVE, searches, filters, sorts, and rejects invalid query values', async () => {
      const { authorization } = await createAdmin();
      const created = [];
      for (const item of [
        catalogBody({ name: 'Barbell Bench Press' }),
        catalogBody({
          name: 'Dumbbell Bench Press',
          equipmentType: ExerciseEquipmentType.DUMBBELL,
        }),
        catalogBody({
          name: 'Back Squat',
          primaryMuscleGroup: ExerciseMuscleGroup.QUADRICEPS,
          difficultyLevel: ExerciseDifficultyLevel.ADVANCED,
        }),
      ]) {
        created.push(
          (
            await request(http)
              .post('/api/v1/exercises')
              .set('Authorization', authorization)
              .send(item)
              .expect(201)
          ).body,
        );
      }

      await request(http)
        .patch(`/api/v1/exercises/${created[2].id}/status`)
        .set('Authorization', authorization)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);

      const defaults = await request(http)
        .get('/api/v1/exercises')
        .set('Authorization', authorization)
        .expect(200);
      expect(defaults.body.meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 2,
        totalPages: 1,
      });
      expect(
        defaults.body.data.map((row: { name: string }) => row.name),
      ).toEqual(
        expect.arrayContaining(['Barbell Bench Press', 'Dumbbell Bench Press']),
      );
      expect(
        defaults.body.data.map((row: { name: string }) => row.name),
      ).not.toContain('Back Squat');
      assertNoSecrets(defaults.body);

      const page = await request(http)
        .get('/api/v1/exercises')
        .query({ page: 1, limit: 1, sort: 'name', direction: 'ASC' })
        .set('Authorization', authorization)
        .expect(200);
      expect(page.body.meta).toEqual({
        page: 1,
        limit: 1,
        totalItems: 2,
        totalPages: 2,
      });
      expect(page.body.data).toHaveLength(1);

      const search = await request(http)
        .get('/api/v1/exercises')
        .query({ search: 'bench' })
        .set('Authorization', authorization)
        .expect(200);
      expect(search.body.data).toHaveLength(2);

      const wildcard = await request(http)
        .get('/api/v1/exercises')
        .query({ search: '%' })
        .set('Authorization', authorization)
        .expect(200);
      expect(wildcard.body.data).toHaveLength(0);

      const filtered = await request(http)
        .get('/api/v1/exercises')
        .query({
          primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
          equipmentType: ExerciseEquipmentType.BARBELL,
          difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
        })
        .set('Authorization', authorization)
        .expect(200);
      expect(filtered.body.data).toHaveLength(1);
      expect(filtered.body.data[0].name).toBe('Barbell Bench Press');

      const archived = await request(http)
        .get('/api/v1/exercises')
        .query({ status: ExerciseStatus.ARCHIVED })
        .set('Authorization', authorization)
        .expect(200);
      expect(archived.body.data).toHaveLength(1);
      expect(archived.body.data[0].name).toBe('Back Squat');

      const named = await request(http)
        .get('/api/v1/exercises')
        .query({ sort: 'name', direction: 'DESC' })
        .set('Authorization', authorization)
        .expect(200);
      expect(named.body.data.map((row: { name: string }) => row.name)).toEqual([
        'Dumbbell Bench Press',
        'Barbell Bench Press',
      ]);

      await request(http)
        .get('/api/v1/exercises')
        .query({ page: 0 })
        .set('Authorization', authorization)
        .expect(400);
      await request(http)
        .get('/api/v1/exercises')
        .query({ limit: 101 })
        .set('Authorization', authorization)
        .expect(400);
      await request(http)
        .get('/api/v1/exercises')
        .query({ sort: 'passwordHash' })
        .set('Authorization', authorization)
        .expect(400);
      await request(http)
        .get('/api/v1/exercises')
        .query({ primaryMuscleGroup: 'NECK' })
        .set('Authorization', authorization)
        .expect(400);
    });
  });

  describe('ownership and catalog visibility', () => {
    it('lets Trainer B read Trainer A catalog items but not modify or archive them', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);

      const created = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAAuth)
        .send(catalogBody())
        .expect(201);

      await request(http)
        .get(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', trainerBAuth)
        .expect(200);

      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Hijacked Press' })
        .expect(404);

      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(404);

      const adminUpdated = await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', authorization)
        .send({ description: 'Updated by admin' })
        .expect(200);
      expect(adminUpdated.body.description).toBe('Updated by admin');

      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', trainerAAuth)
        .send({ name: 'Paused Bench Press' })
        .expect(200);

      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', trainerAAuth)
        .send({ createdByUserId: trainerB.user.id })
        .expect(400);

      const client = await createUser({
        email: 'client@example.com',
        role: UserRole.CLIENT,
        firstName: 'Cara',
        lastName: 'Client',
      });
      const clientAuth = await authHeader(client.email);
      await request(http)
        .get('/api/v1/exercises')
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .get(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .set('Authorization', clientAuth)
        .send({ name: 'Nope' })
        .expect(403);
      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}/status`)
        .set('Authorization', clientAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(403);

      await request(http).get('/api/v1/exercises').expect(401);
      await request(http)
        .get(`/api/v1/exercises/${created.body.id}`)
        .expect(401);
      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}`)
        .send({ name: 'Nope' })
        .expect(401);
      await request(http)
        .patch(`/api/v1/exercises/${created.body.id}/status`)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(401);
    });
  });

  describe('archive, detail and disabled creator', () => {
    it('archives and reactivates without deleting, and keeps catalog usable after the creator is disabled', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const otherTrainer = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAuth = await authHeader(trainer.user.email);

      const created = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAuth)
        .send(catalogBody({ name: 'Romanian Deadlift' }))
        .expect(201);
      const exerciseId = readExerciseId(created.body);

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);

      const defaultList = await request(http)
        .get('/api/v1/exercises')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(defaultList.body.data).toHaveLength(0);

      const archivedList = await request(http)
        .get('/api/v1/exercises')
        .query({ status: ExerciseStatus.ARCHIVED })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(archivedList.body.data).toHaveLength(1);

      const byId = await request(http)
        .get(`/api/v1/exercises/${exerciseId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(byId.body.status).toBe(ExerciseStatus.ARCHIVED);

      await request(http)
        .get('/api/v1/exercises/not-a-uuid')
        .set('Authorization', trainerAuth)
        .expect(400);
      await request(http)
        .get(`/api/v1/exercises/${randomUUID()}`)
        .set('Authorization', trainerAuth)
        .expect(404);

      await expect(
        exercisesService.requireActiveExercise(exerciseId),
      ).rejects.toBeInstanceOf(ConflictException);

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ACTIVE })
        .expect(200);

      const activeAgain = await request(http)
        .get('/api/v1/exercises')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(activeAgain.body.data).toHaveLength(1);
      await exercisesService.requireActiveExercise(exerciseId);

      await request(http)
        .patch(`/api/v1/trainers/${trainer.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      const stillActive = await request(http)
        .get(`/api/v1/exercises/${exerciseId}`)
        .set('Authorization', authorization)
        .expect(200);
      expect(stillActive.body.status).toBe(ExerciseStatus.ACTIVE);

      const otherAuth = await authHeader(otherTrainer.user.email);
      const visible = await request(http)
        .get('/api/v1/exercises')
        .set('Authorization', otherAuth)
        .expect(200);
      expect(visible.body.data).toHaveLength(1);

      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: trainer.user.email, password: PASSWORD })
        .expect(401);
    });
  });

  describe('persistence integrity', () => {
    it('enforces creator FK and PostgreSQL enums', async () => {
      const { user: admin } = await createAdmin();
      const now = new Date();

      try {
        await exercises.save(
          exercises.create({
            name: 'Ghost Press',
            primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
            equipmentType: ExerciseEquipmentType.BARBELL,
            difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
            status: ExerciseStatus.ACTIVE,
            createdByUserId: randomUUID(),
            createdAt: now,
            updatedAt: now,
          }),
        );
        throw new Error('expected missing creator to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercises (
            name, primary_muscle_group, equipment_type, difficulty_level, status, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'Invalid Muscle',
            'NECK',
            ExerciseEquipmentType.BARBELL,
            ExerciseDifficultyLevel.BEGINNER,
            ExerciseStatus.ACTIVE,
            admin.id,
          ],
        );
        throw new Error('expected invalid muscle group to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercises (
            name, primary_muscle_group, equipment_type, difficulty_level, status, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'Invalid Equipment',
            ExerciseMuscleGroup.CHEST,
            'SMITH',
            ExerciseDifficultyLevel.BEGINNER,
            ExerciseStatus.ACTIVE,
            admin.id,
          ],
        );
        throw new Error('expected invalid equipment to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercises (
            name, primary_muscle_group, equipment_type, difficulty_level, status, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'Invalid Difficulty',
            ExerciseMuscleGroup.CHEST,
            ExerciseEquipmentType.BARBELL,
            'ELITE',
            ExerciseStatus.ACTIVE,
            admin.id,
          ],
        );
        throw new Error('expected invalid difficulty to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO exercises (
            name, primary_muscle_group, equipment_type, difficulty_level, status, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'Invalid Status',
            ExerciseMuscleGroup.CHEST,
            ExerciseEquipmentType.BARBELL,
            ExerciseDifficultyLevel.BEGINNER,
            'DELETED',
            admin.id,
          ],
        );
        throw new Error('expected invalid status to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }

      await exercises.save(
        exercises.create({
          name: 'Cable Row',
          primaryMuscleGroup: ExerciseMuscleGroup.BACK,
          equipmentType: ExerciseEquipmentType.CABLE,
          difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
          status: ExerciseStatus.ACTIVE,
          createdByUserId: admin.id,
        }),
      );

      try {
        await exercises.save(
          exercises.create({
            name: 'cable   row',
            primaryMuscleGroup: ExerciseMuscleGroup.BACK,
            equipmentType: ExerciseEquipmentType.CABLE,
            difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
            status: ExerciseStatus.ACTIVE,
            createdByUserId: admin.id,
          }),
        );
        throw new Error('expected creator-name uniqueness to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }
    });
  });
});
