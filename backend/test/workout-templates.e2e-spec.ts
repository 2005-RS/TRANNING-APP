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
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { WorkoutPrescriptionType } from '../src/modules/workout-templates/enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../src/modules/workout-templates/enums/workout-template-status.enum';
import { WorkoutTemplateExercise } from '../src/modules/workout-templates/entities/workout-template-exercise.entity';
import { WorkoutTemplate } from '../src/modules/workout-templates/entities/workout-template.entity';
import { WorkoutTemplatesService } from '../src/modules/workout-templates/workout-templates.service';
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
  expect(raw).not.toContain('storageKey');
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

describe('Workout templates (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let templates: Repository<WorkoutTemplate>;
  let templateExercises: Repository<WorkoutTemplateExercise>;
  let hasher: PasswordHasherService;
  let workoutTemplates: WorkoutTemplatesService;

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
    templates = dataSource.getRepository(WorkoutTemplate);
    templateExercises = dataSource.getRepository(WorkoutTemplateExercise);
    hasher = app.get(PasswordHasherService);
    workoutTemplates = app.get(WorkoutTemplatesService);
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

  async function createExercise(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', authorization)
      .send(catalogBody(overrides))
      .expect(201);
    return readId(response.body);
  }

  async function createTemplate(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', authorization)
      .send({ name: 'Push Day', ...overrides })
      .expect(201);
    return readId(response.body);
  }

  function repsItem(
    exerciseId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      exerciseId,
      sets: 4,
      prescriptionType: WorkoutPrescriptionType.REPS,
      repsMin: 8,
      repsMax: 10,
      restSeconds: 120,
      targetRir: 2,
      ...overrides,
    };
  }

  function durationItem(
    exerciseId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      exerciseId,
      sets: 3,
      prescriptionType: WorkoutPrescriptionType.DURATION,
      durationSeconds: 45,
      restSeconds: 60,
      ...overrides,
    };
  }

  describe('authorization matrix', () => {
    it('lets ADMIN and TRAINER create templates and rejects CLIENT, anonymous, and mass assignment', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await createUser({
        email: 'client@example.com',
        role: UserRole.CLIENT,
        firstName: 'Cara',
        lastName: 'Client',
      });

      const created = await request(http)
        .post('/api/v1/workout-templates')
        .set('Authorization', authorization)
        .send({ name: '  Push   Day  ', description: 'Upper pressing.' })
        .expect(201);
      expect(created.body.status).toBe(WorkoutTemplateStatus.DRAFT);
      expect(created.body.createdByUserId).toBe(admin.id);
      expect(created.body.name).toBe('Push Day');
      expect(created.body.items).toEqual([]);
      assertNoSecrets(created.body);

      const trainerAuth = await authHeader(trainer.user.email);
      const trainerCreated = await request(http)
        .post('/api/v1/workout-templates')
        .set('Authorization', trainerAuth)
        .send({ name: 'Pull Day' })
        .expect(201);
      expect(trainerCreated.body.createdByUserId).toBe(trainer.user.id);

      await request(http)
        .post('/api/v1/workout-templates')
        .set('Authorization', await authHeader(client.email))
        .send({ name: 'Client Plan' })
        .expect(403);

      await request(http)
        .post('/api/v1/workout-templates')
        .send({ name: 'Anon' })
        .expect(401);

      await request(http)
        .get('/api/v1/workout-templates')
        .set('Authorization', await authHeader(client.email))
        .expect(403);
      await request(http)
        .get(`/api/v1/workout-templates/${created.body.id}`)
        .set('Authorization', await authHeader(client.email))
        .expect(403);
      await request(http).get('/api/v1/workout-templates').expect(401);

      await request(http)
        .post('/api/v1/workout-templates')
        .set('Authorization', authorization)
        .send({
          name: 'Hijack',
          createdByUserId: randomUUID(),
          status: WorkoutTemplateStatus.ACTIVE,
          clientId: randomUUID(),
          trainerId: randomUUID(),
        })
        .expect(400);
    });
  });

  describe('ownership and shared ACTIVE library', () => {
    it('lets Trainer B read Trainer A ACTIVE templates but not mutate them; ADMIN may mutate', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const exerciseId = await createExercise(trainerAAuth);

      const templateId = await createTemplate(trainerAAuth, {
        name: 'Template A',
      });
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);

      const shared = await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(shared.body.id).toBe(templateId);
      expect(shared.body.items).toHaveLength(1);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Hijacked' })
        .expect(404);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerBAuth)
        .send({ items: [repsItem(exerciseId, { sets: 5 })] })
        .expect(404);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: WorkoutTemplateStatus.ARCHIVED })
        .expect(404);

      const adminPatched = await request(http)
        .patch(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', authorization)
        .send({ name: 'Template A Admin' })
        .expect(200);
      expect(adminPatched.body.name).toBe('Template A Admin');
    });

    it('hides Trainer A drafts from Trainer B until activation', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const exerciseId = await createExercise(trainerAAuth);
      const templateId = await createTemplate(trainerAAuth, {
        name: 'Secret Draft',
      });

      await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerBAuth)
        .expect(404);

      const trainerBList = await request(http)
        .get('/api/v1/workout-templates')
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(trainerBList.body.data).toHaveLength(0);

      const trainerBDrafts = await request(http)
        .get('/api/v1/workout-templates')
        .query({ status: WorkoutTemplateStatus.DRAFT })
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(trainerBDrafts.body.data).toHaveLength(0);

      await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerAAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', authorization)
        .expect(200);

      const adminDrafts = await request(http)
        .get('/api/v1/workout-templates')
        .query({ status: WorkoutTemplateStatus.DRAFT })
        .set('Authorization', authorization)
        .expect(200);
      expect(
        adminDrafts.body.data.map((row: { id: string }) => row.id),
      ).toContain(templateId);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);

      await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerBAuth)
        .expect(200);
    });
  });

  describe('prescriptions and ordering', () => {
    it('assigns positions from array order and allows the same exercise twice', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseA = await createExercise(trainerAuth, {
        name: 'Exercise A',
      });
      const exerciseB = await createExercise(trainerAuth, {
        name: 'Exercise B',
        primaryMuscleGroup: ExerciseMuscleGroup.BACK,
        equipmentType: ExerciseEquipmentType.CABLE,
      });
      const exerciseC = await createExercise(trainerAuth, {
        name: 'Exercise C',
        primaryMuscleGroup: ExerciseMuscleGroup.CORE,
        equipmentType: ExerciseEquipmentType.BODYWEIGHT,
      });
      const templateId = await createTemplate(trainerAuth);

      const replaced = await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            repsItem(exerciseC),
            repsItem(exerciseA, {
              sets: 5,
              repsMin: 3,
              repsMax: 5,
              targetRir: 1,
            }),
            durationItem(exerciseB),
            repsItem(exerciseA, {
              sets: 2,
              repsMin: 12,
              repsMax: 15,
              targetRir: 3,
            }),
          ],
        })
        .expect(200);

      expect(
        replaced.body.items.map(
          (item: { position: number; exercise: { id: string } }) => [
            item.position,
            item.exercise.id,
          ],
        ),
      ).toEqual([
        [1, exerciseC],
        [2, exerciseA],
        [3, exerciseB],
        [4, exerciseA],
      ]);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            {
              ...repsItem(exerciseA),
              position: 99,
              actualWeight: 80,
              actualReps: 10,
            },
          ],
        })
        .expect(400);
    });

    it('rejects invalid REPS, DURATION, and RPE/RIR combinations', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createTemplate(trainerAuth);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId, { repsMin: 10, repsMax: 8 })] })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [repsItem(exerciseId, { repsMin: undefined })],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [repsItem(exerciseId, { durationSeconds: 45 })],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId, { repsMin: 0, repsMax: 8 })] })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [durationItem(exerciseId, { durationSeconds: 0 })] })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [durationItem(exerciseId, { repsMin: 8, repsMax: 10 })],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [durationItem(exerciseId, { durationSeconds: undefined })],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [repsItem(exerciseId, { targetRpe: 8.5, targetRir: 2 })],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            repsItem(exerciseId, { targetRpe: 10.5, targetRir: undefined }),
          ],
        })
        .expect(400);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            repsItem(exerciseId, { targetRir: -1, targetRpe: undefined }),
          ],
        })
        .expect(400);

      const validRpe = await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            repsItem(exerciseId, { targetRir: undefined, targetRpe: 8.5 }),
          ],
        })
        .expect(200);
      expect(validRpe.body.items[0].targetRpe).toBe(8.5);
      expect(validRpe.body.items[0].targetRir).toBeNull();
    });
  });

  describe('atomic replacement and archived exercises', () => {
    it('rejects archived exercises without changing existing items', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseA = await createExercise(trainerAuth, { name: 'Active A' });
      const exerciseB = await createExercise(trainerAuth, {
        name: 'Active B',
        primaryMuscleGroup: ExerciseMuscleGroup.BACK,
      });
      const exerciseC = await createExercise(trainerAuth, {
        name: 'Archived C',
        primaryMuscleGroup: ExerciseMuscleGroup.SHOULDERS,
      });
      await request(http)
        .patch(`/api/v1/exercises/${exerciseC}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);

      const templateId = await createTemplate(trainerAuth);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseA)] })
        .expect(200);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [repsItem(exerciseB), repsItem(exerciseC)],
        })
        .expect(409);

      const detail = await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(detail.body.items).toHaveLength(1);
      expect(detail.body.items[0].exercise.id).toBe(exerciseA);
    });

    it('rolls back replacement when item persistence fails', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseA = await createExercise(trainerAuth, { name: 'Keep A' });
      const exerciseB = await createExercise(trainerAuth, { name: 'New B' });
      const templateId = await createTemplate(trainerAuth);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseA)] })
        .expect(200);

      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(WorkoutTemplateExercise);
            jest
              .spyOn(repo, 'save')
              .mockRejectedValueOnce(new Error('forced item failure'));
            return (
              runInTransaction as (m: typeof manager) => Promise<unknown>
            )(manager);
          });
        });

      try {
        await request(http)
          .put(`/api/v1/workout-templates/${templateId}/exercises`)
          .set('Authorization', trainerAuth)
          .send({ items: [repsItem(exerciseB)] })
          .expect(500);

        const detail = await request(http)
          .get(`/api/v1/workout-templates/${templateId}`)
          .set('Authorization', trainerAuth)
          .expect(200);
        expect(detail.body.items).toHaveLength(1);
        expect(detail.body.items[0].exercise.id).toBe(exerciseA);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('lifecycle and usability', () => {
    it('activates, lists, archives, and reactivates usable templates', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createTemplate(trainerAuth, {
        name: 'Leg Day',
        description: 'Lower body strength',
      });

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(409);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [] })
        .expect(200);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);

      const listed = await request(http)
        .get('/api/v1/workout-templates')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(listed.body.data.map((row: { id: string }) => row.id)).toEqual([
        templateId,
      ]);

      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [] })
        .expect(409);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ARCHIVED })
        .expect(200);

      const defaultList = await request(http)
        .get('/api/v1/workout-templates')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(defaultList.body.data).toHaveLength(0);

      const archivedList = await request(http)
        .get('/api/v1/workout-templates')
        .query({ status: WorkoutTemplateStatus.ARCHIVED })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(archivedList.body.data).toHaveLength(1);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Should fail' })
        .expect(409);

      const reactivated = await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);
      expect(reactivated.body.status).toBe(WorkoutTemplateStatus.ACTIVE);

      await request(http)
        .get(`/api/v1/workout-templates/not-a-uuid`)
        .set('Authorization', trainerAuth)
        .expect(400);
      await request(http)
        .get(`/api/v1/workout-templates/${randomUUID()}`)
        .set('Authorization', trainerAuth)
        .expect(404);
      await request(http)
        .get('/api/v1/workout-templates')
        .query({ sort: 'calories' })
        .set('Authorization', trainerAuth)
        .expect(400);
    });

    it('keeps an ACTIVE template after its exercise is archived but rejects usability lookup', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createTemplate(trainerAuth);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);

      const row = await templates.findOneByOrFail({ id: templateId });
      expect(row.status).toBe(WorkoutTemplateStatus.ACTIVE);

      const detail = await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(detail.body.status).toBe(WorkoutTemplateStatus.ACTIVE);
      expect(detail.body.items[0].exercise.status).toBe(
        ExerciseStatus.ARCHIVED,
      );

      await expect(
        workoutTemplates.requireUsableTemplate(templateId),
      ).rejects.toBeInstanceOf(ConflictException);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(409);
    });

    it('keeps shared ACTIVE templates after the creator is disabled', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const other = await provisionTrainer(authorization, {
        email: 'other@example.com',
        firstName: 'Other',
      });
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createTemplate(trainerAuth, {
        name: 'Shared Push',
      });
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);

      await request(http)
        .patch(`/api/v1/trainers/${trainer.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      const row = await templates.findOneByOrFail({ id: templateId });
      expect(row.status).toBe(WorkoutTemplateStatus.ACTIVE);

      const otherAuth = await authHeader(other.user.email);
      const visible = await request(http)
        .get(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', otherAuth)
        .expect(200);
      expect(visible.body.status).toBe(WorkoutTemplateStatus.ACTIVE);

      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: trainer.user.email, password: PASSWORD })
        .expect(401);

      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}`)
        .set('Authorization', authorization)
        .send({ description: 'Managed by admin' })
        .expect(200);
    });
  });

  describe('search pagination and list scoping', () => {
    it('searches name and description, paginates, and sorts on the allowlist', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);

      for (const name of ['Alpha Push', 'Beta Pull', 'Gamma Searchable']) {
        const id = await createTemplate(trainerAuth, {
          name,
          description: name === 'Beta Pull' ? 'Searchable description' : null,
        });
        await request(http)
          .put(`/api/v1/workout-templates/${id}/exercises`)
          .set('Authorization', trainerAuth)
          .send({ items: [repsItem(exerciseId)] })
          .expect(200);
        await request(http)
          .patch(`/api/v1/workout-templates/${id}/status`)
          .set('Authorization', trainerAuth)
          .send({ status: WorkoutTemplateStatus.ACTIVE })
          .expect(200);
      }

      const search = await request(http)
        .get('/api/v1/workout-templates')
        .query({ search: 'Searchable', sort: 'name', direction: 'ASC' })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(search.body.data.map((row: { name: string }) => row.name)).toEqual(
        ['Beta Pull', 'Gamma Searchable'],
      );

      const page = await request(http)
        .get('/api/v1/workout-templates')
        .query({ page: 1, limit: 2, sort: 'name', direction: 'ASC' })
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
      expect(page.body.data[0]).not.toHaveProperty('items');
    });
  });

  describe('persistence integrity', () => {
    it('enforces FKs, unique positions, and prescription CHECKs', async () => {
      const { user: admin, authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createTemplate(trainerAuth);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({ items: [repsItem(exerciseId)] })
        .expect(200);

      try {
        await templates.save(
          templates.create({
            name: 'Ghost',
            status: WorkoutTemplateStatus.DRAFT,
            createdByUserId: randomUUID(),
          }),
        );
        throw new Error('expected missing creator to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await templateExercises.save(
          templateExercises.create({
            workoutTemplateId: randomUUID(),
            exerciseId,
            position: 1,
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 8,
            repsMax: 10,
            durationSeconds: null,
            restSeconds: 60,
          }),
        );
        throw new Error('expected missing template to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await templateExercises.save(
          templateExercises.create({
            workoutTemplateId: templateId,
            exerciseId: randomUUID(),
            position: 2,
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 8,
            repsMax: 10,
            durationSeconds: null,
            restSeconds: 60,
          }),
        );
        throw new Error('expected missing exercise to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await templateExercises.save(
          templateExercises.create({
            workoutTemplateId: templateId,
            exerciseId,
            position: 1,
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 5,
            repsMax: 6,
            durationSeconds: null,
            restSeconds: 60,
          }),
        );
        throw new Error('expected duplicate position to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds
          ) VALUES ($1, $2, 0, 3, 'REPS', 8, 10, NULL, 60)`,
          [templateId, exerciseId],
        );
        throw new Error('expected invalid position to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds
          ) VALUES ($1, $2, 2, 0, 'REPS', 8, 10, NULL, 60)`,
          [templateId, exerciseId],
        );
        throw new Error('expected invalid sets to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds
          ) VALUES ($1, $2, 2, 3, 'REPS', 10, 8, NULL, 60)`,
          [templateId, exerciseId],
        );
        throw new Error('expected invalid REPS range to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds
          ) VALUES ($1, $2, 2, 3, 'REPS', 8, 10, 45, 60)`,
          [templateId, exerciseId],
        );
        throw new Error('expected REPS with duration to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds
          ) VALUES ($1, $2, 2, 3, 'DURATION', NULL, NULL, 0, 60)`,
          [templateId, exerciseId],
        );
        throw new Error('expected zero duration to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_template_exercises (
            workout_template_id, exercise_id, position, sets, prescription_type,
            reps_min, reps_max, duration_seconds, rest_seconds, target_rpe, target_rir
          ) VALUES ($1, $2, 2, 3, 'REPS', 8, 10, NULL, 60, 8.5, 2)`,
          [templateId, exerciseId],
        );
        throw new Error('expected RPE and RIR together to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO workout_templates (name, status, created_by_user_id)
           VALUES ($1, $2, $3)`,
          ['Invalid', 'DELETED', admin.id],
        );
        throw new Error('expected invalid status to fail');
      } catch (error) {
        expect(isPostgresInvalidEnum(error)).toBe(true);
      }
    });
  });
});
