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
  isPostgresUniqueViolation,
} from '../src/database/postgres-errors';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { TrainingPlan } from '../src/modules/training-plans/entities/training-plan.entity';
import { TrainingPlanWorkout } from '../src/modules/training-plans/entities/training-plan-workout.entity';
import { TrainingPlanStatus } from '../src/modules/training-plans/enums/training-plan-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { WorkoutSessionExercise } from '../src/modules/workout-sessions/entities/workout-session-exercise.entity';
import { WorkoutSession } from '../src/modules/workout-sessions/entities/workout-session.entity';
import { WorkoutSet } from '../src/modules/workout-sessions/entities/workout-set.entity';
import { WorkoutSessionStatus } from '../src/modules/workout-sessions/enums/workout-session-status.enum';
import { WorkoutPrescriptionType } from '../src/modules/workout-templates/enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../src/modules/workout-templates/enums/workout-template-status.enum';
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

describe('Workout sessions (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let sessions: Repository<WorkoutSession>;
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
    sessions = dataSource.getRepository(WorkoutSession);
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

  async function createExercise(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', authorization)
      .send({
        name: 'Barbell Bench Press',
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
        ...overrides,
      })
      .expect(201);
    return readId(response.body);
  }

  async function createUsableTemplate(
    authorization: string,
    name: string,
    items: Array<Record<string, unknown>>,
  ): Promise<string> {
    const created = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', authorization)
      .send({ name, description: `${name} description` })
      .expect(201);
    const id = readId(created.body);
    await request(http)
      .put(`/api/v1/workout-templates/${id}/exercises`)
      .set('Authorization', authorization)
      .send({ items })
      .expect(200);
    await request(http)
      .patch(`/api/v1/workout-templates/${id}/status`)
      .set('Authorization', authorization)
      .send({ status: WorkoutTemplateStatus.ACTIVE })
      .expect(200);
    return id;
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
      durationSeconds: 30,
      restSeconds: 60,
      ...overrides,
    };
  }

  async function activatePlan(
    trainerAuth: string,
    clientId: string,
    templateId: string,
    loadKg = 80,
  ) {
    const plan = await request(http)
      .post(`/api/v1/clients/${clientId}/training-plans`)
      .set('Authorization', trainerAuth)
      .send({ name: 'Hypertrophy Phase 1' })
      .expect(201);
    const planId = readId(plan.body);
    await request(http)
      .put(`/api/v1/clients/${clientId}/training-plans/${planId}/workouts`)
      .set('Authorization', trainerAuth)
      .send({ workouts: [{ workoutTemplateId: templateId }] })
      .expect(200);
    const detail = await request(http)
      .get(`/api/v1/clients/${clientId}/training-plans/${planId}`)
      .set('Authorization', trainerAuth)
      .expect(200);
    const planWorkoutId = detail.body.workouts[0].id as string;
    const planExerciseId = detail.body.workouts[0].exercises[0].id as string;
    await request(http)
      .patch(
        `/api/v1/clients/${clientId}/training-plans/${planId}/exercises/${planExerciseId}`,
      )
      .set('Authorization', trainerAuth)
      .send({ targetLoadKg: loadKg })
      .expect(200);
    await request(http)
      .patch(`/api/v1/clients/${clientId}/training-plans/${planId}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);
    return { planId, planWorkoutId, planExerciseId };
  }

  describe('start authorization and route ordering', () => {
    it('lets CLIENT start own current workout and rejects others plus mass assignment', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      const other = await provisionClient(authorization, {
        email: 'other@example.com',
        firstName: 'Omar',
      });
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const otherAuth = await authHeader(other.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push Day', [
        repsItem(exerciseId),
      ]);
      const { planWorkoutId } = await activatePlan(
        trainerAuth,
        client.id,
        templateId,
      );

      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(401);
      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', trainerAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(403);
      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', authorization)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(403);

      const created = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({
          trainingPlanWorkoutId: planWorkoutId,
          clientProfileId: other.id,
          status: WorkoutSessionStatus.COMPLETED,
          startedAt: '2020-01-01T00:00:00.000Z',
        })
        .expect(400);

      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      expect(started.body.status).toBe(WorkoutSessionStatus.IN_PROGRESS);
      expect(started.body.workoutName).toBe('Push Day');
      expect(started.body.exercises[0].prescription).toMatchObject({
        sets: 4,
        type: 'REPS',
        repsMin: 8,
        repsMax: 10,
        targetLoadKg: 80,
        targetRir: 2,
      });
      expect(created.status).toBe(400);

      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', otherAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(404);

      await request(http)
        .get('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .expect(200);
      await request(http)
        .get('/api/v1/clients/me/workout-sessions')
        .set('Authorization', authorization)
        .expect(403);
      await request(http)
        .get('/api/v1/clients/me/workout-sessions')
        .set('Authorization', trainerAuth)
        .expect(403);
    });
  });

  describe('snapshot isolation and plan independence', () => {
    it('keeps the session prescription after plan edits, workout replacement, archive, and exercise rename', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push Day', [
        repsItem(exerciseId),
      ]);
      const replacement = await createUsableTemplate(trainerAuth, 'Pull Day', [
        repsItem(exerciseId, { sets: 3, repsMin: 6, repsMax: 8, targetRir: 1 }),
      ]);
      const { planId, planWorkoutId, planExerciseId } = await activatePlan(
        trainerAuth,
        client.id,
        templateId,
      );

      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      const sessionId = readId(started.body);
      const sessionExerciseId = started.body.exercises[0].id as string;
      const originalWorkoutId = started.body
        .sourceTrainingPlanWorkoutId as string;

      await request(http)
        .patch(
          `/api/v1/clients/${client.id}/training-plans/${planId}/exercises/${planExerciseId}`,
        )
        .set('Authorization', trainerAuth)
        .send({
          sets: 5,
          repsMin: 5,
          repsMax: 5,
          targetLoadKg: 90,
          targetRir: 1,
        })
        .expect(200);

      const isolated = await request(http)
        .get(`/api/v1/clients/me/workout-sessions/${sessionId}`)
        .set('Authorization', clientAuth)
        .expect(200);
      expect(isolated.body.exercises[0].prescription).toMatchObject({
        sets: 4,
        repsMin: 8,
        repsMax: 10,
        targetLoadKg: 80,
        targetRir: 2,
      });

      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: replacement }] })
        .expect(200);
      expect(
        await dataSource
          .getRepository(TrainingPlanWorkout)
          .count({ where: { id: originalWorkoutId } }),
      ).toBe(0);

      const afterReplace = await request(http)
        .get(`/api/v1/clients/me/workout-sessions/${sessionId}`)
        .set('Authorization', clientAuth)
        .expect(200);
      expect(afterReplace.body.exercises[0].id).toBe(sessionExerciseId);
      expect(afterReplace.body.exercises[0].prescription.sets).toBe(4);

      await request(http)
        .patch(`/api/v1/exercises/${exerciseId}`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Competition Bench Press' })
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ARCHIVED })
        .expect(200);

      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({
          sets: [
            { actualReps: 10, actualLoadKg: 80, actualRpe: 8 },
            { actualReps: 9, actualLoadKg: 80, actualRpe: 9 },
          ],
        })
        .expect(200);

      const completed = await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);
      expect(completed.body.status).toBe(WorkoutSessionStatus.COMPLETED);
      expect(completed.body.exercises[0].exerciseName).toBe(
        'Barbell Bench Press',
      );

      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(404);
    });
  });

  describe('execution, uniqueness, and terminal states', () => {
    it('enforces one IN_PROGRESS session, set validation, completion, and cancellation', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const repsExercise = await createExercise(trainerAuth);
      const plank = await createExercise(trainerAuth, {
        name: 'Plank',
        primaryMuscleGroup: ExerciseMuscleGroup.CORE,
        equipmentType: ExerciseEquipmentType.BODYWEIGHT,
      });
      const push = await createUsableTemplate(trainerAuth, 'Push Day', [
        repsItem(repsExercise),
      ]);
      const hold = await createUsableTemplate(trainerAuth, 'Core', [
        durationItem(plank),
      ]);
      const { planId, planWorkoutId } = await activatePlan(
        trainerAuth,
        client.id,
        push,
      );

      const first = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      const sessionId = readId(first.body);
      const sessionExerciseId = first.body.exercises[0].id as string;

      await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(409);

      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(409);

      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({
          sets: [{ actualReps: 10 }, { actualReps: 9 }, { actualReps: 8 }],
        })
        .expect(200);

      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualDurationSeconds: 30 }] })
        .expect(400);
      const afterInvalid = await request(http)
        .get(`/api/v1/clients/me/workout-sessions/${sessionId}`)
        .set('Authorization', clientAuth)
        .expect(200);
      expect(
        afterInvalid.body.exercises[0].sets.map(
          (row: { actualReps: number }) => row.actualReps,
        ),
      ).toEqual([10, 9, 8]);

      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({
          sets: [{ actualReps: 8, actualRpe: 8, actualRir: 1 }],
        })
        .expect(400);
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 8, actualLoadKg: -1 }] })
        .expect(400);
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({
          sets: Array.from({ length: 51 }, () => ({ actualReps: 5 })),
        })
        .expect(400);

      const completed = await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);
      const completedAt = completed.body.completedAt as string;
      const again = await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);
      expect(again.body.completedAt).toBe(completedAt);
      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.CANCELLED })
        .expect(409);
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 1 }] })
        .expect(409);

      const planB = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Plan B' })
        .expect(201);
      const planBId = readId(planB.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planBId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: hold }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planBId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);
      expect(
        await dataSource.getRepository(TrainingPlan).count({
          where: { id: planId, status: TrainingPlanStatus.ARCHIVED },
        }),
      ).toBe(1);

      const durationPlan = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planBId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      const durationWorkoutId = durationPlan.body.workouts[0].id as string;
      const durationSession = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: durationWorkoutId })
        .expect(201);
      const durationSessionId = readId(durationSession.body);
      const durationExerciseId = durationSession.body.exercises[0].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${durationSessionId}/exercises/${durationExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 10 }] })
        .expect(400);
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${durationSessionId}/exercises/${durationExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualDurationSeconds: 25 }] })
        .expect(200);

      const cancelled = await request(http)
        .patch(
          `/api/v1/clients/me/workout-sessions/${durationSessionId}/status`,
        )
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.CANCELLED })
        .expect(200);
      expect(cancelled.body.status).toBe(WorkoutSessionStatus.CANCELLED);
      expect(cancelled.body.cancelledAt).toBeTruthy();
      expect(cancelled.body.exercises[0].sets).toHaveLength(1);
      const current = await request(http)
        .get('/api/v1/clients/me/workout-sessions/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(current.body.workoutSession).toBeNull();
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${durationSessionId}/exercises/${durationExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [] })
        .expect(409);
    });

    it('rolls back set replacement when persistence fails after delete', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push', [
        repsItem(exerciseId),
      ]);
      const { planWorkoutId } = await activatePlan(
        trainerAuth,
        client.id,
        templateId,
      );
      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      const sessionId = readId(started.body);
      const sessionExerciseId = started.body.exercises[0].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({
          sets: [{ actualReps: 10 }, { actualReps: 9 }, { actualReps: 8 }],
        })
        .expect(200);

      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(WorkoutSet);
            jest
              .spyOn(repo, 'save')
              .mockRejectedValueOnce(new Error('forced set failure'));
            return (
              runInTransaction as (m: typeof manager) => Promise<unknown>
            )(manager);
          });
        });

      try {
        await request(http)
          .put(
            `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
          )
          .set('Authorization', clientAuth)
          .send({ sets: [{ actualReps: 1 }] })
          .expect(500);
        const detail = await request(http)
          .get(`/api/v1/clients/me/workout-sessions/${sessionId}`)
          .set('Authorization', clientAuth)
          .expect(200);
        expect(
          detail.body.exercises[0].sets.map(
            (row: { actualReps: number }) => row.actualReps,
          ),
        ).toEqual([10, 9, 8]);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('visibility, lists, and persistence', () => {
    it('moves trainer read access with reassignment and keeps client ownership private', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);
      const other = await provisionClient(authorization, {
        email: 'other@example.com',
        firstName: 'Omar',
      });
      await assign(authorization, client.id, trainerA.id);
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const clientAuth = await authHeader(client.user.email);
      const otherAuth = await authHeader(other.user.email);
      const exerciseId = await createExercise(trainerAAuth);
      const templateId = await createUsableTemplate(trainerAAuth, 'Push', [
        repsItem(exerciseId),
      ]);
      const { planWorkoutId } = await activatePlan(
        trainerAAuth,
        client.id,
        templateId,
      );
      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      const sessionId = readId(started.body);
      const sessionExerciseId = started.body.exercises[0].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 8 }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);

      await request(http)
        .get(`/api/v1/clients/${client.id}/workout-sessions/${sessionId}`)
        .set('Authorization', trainerAAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/${client.id}/workout-sessions/${sessionId}`)
        .set('Authorization', trainerBAuth)
        .expect(404);
      await request(http)
        .get(`/api/v1/clients/${client.id}/workout-sessions/${sessionId}`)
        .set('Authorization', authorization)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/me/workout-sessions/${sessionId}`)
        .set('Authorization', otherAuth)
        .expect(404);
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', trainerAAuth)
        .send({ sets: [{ actualReps: 1 }] })
        .expect(403);

      await assign(authorization, client.id, trainerB.id);

      await request(http)
        .get(`/api/v1/clients/${client.id}/workout-sessions/${sessionId}`)
        .set('Authorization', trainerAAuth)
        .expect(404);
      const asB = await request(http)
        .get(`/api/v1/clients/${client.id}/workout-sessions/${sessionId}`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(asB.body.status).toBe(WorkoutSessionStatus.COMPLETED);
      expect(asB.body.exercises[0].sets[0].actualReps).toBe(8);
    });

    it('paginates summaries, filters by status and UTC date, and enforces uniqueness plus CHECKs', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push', [
        repsItem(exerciseId),
      ]);
      const { planWorkoutId } = await activatePlan(
        trainerAuth,
        client.id,
        templateId,
      );
      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      const sessionId = readId(started.body);
      const sessionExerciseId = started.body.exercises[0].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 8 }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);

      const list = await request(http)
        .get('/api/v1/clients/me/workout-sessions?limit=1')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).not.toHaveProperty('exercises');
      expect(list.body.meta).toMatchObject({
        page: 1,
        limit: 1,
        totalItems: 1,
      });
      const completedOnly = await request(http)
        .get(
          `/api/v1/clients/me/workout-sessions?status=${WorkoutSessionStatus.COMPLETED}`,
        )
        .set('Authorization', clientAuth)
        .expect(200);
      expect(completedOnly.body.data).toHaveLength(1);
      const today = new Date().toISOString().slice(0, 10);
      const ranged = await request(http)
        .get(
          `/api/v1/clients/${client.id}/workout-sessions?dateFrom=${today}&dateTo=${today}`,
        )
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(ranged.body.data).toHaveLength(1);
      const emptyRange = await request(http)
        .get(
          '/api/v1/clients/me/workout-sessions?dateFrom=2020-01-01&dateTo=2020-01-02',
        )
        .set('Authorization', clientAuth)
        .expect(200);
      expect(emptyRange.body.data).toHaveLength(0);

      try {
        await sessions.save(
          sessions.create({
            clientProfileId: randomUUID(),
            trainingPlanId: started.body.trainingPlanId,
            sourceTrainingPlanWorkoutId: randomUUID(),
            workoutNameSnapshot: 'Ghost',
            status: WorkoutSessionStatus.IN_PROGRESS,
            startedAt: new Date(),
          }),
        );
        throw new Error('expected missing client to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      const open = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId })
        .expect(201);
      try {
        await sessions.save(
          sessions.create({
            clientProfileId: client.id,
            trainingPlanId: started.body.trainingPlanId,
            sourceTrainingPlanWorkoutId: randomUUID(),
            workoutNameSnapshot: 'Second Open',
            status: WorkoutSessionStatus.IN_PROGRESS,
            startedAt: new Date(),
          }),
        );
        throw new Error('expected second IN_PROGRESS to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      const exerciseRow = await dataSource
        .getRepository(WorkoutSessionExercise)
        .findOneByOrFail({ workoutSessionId: readId(open.body) });
      try {
        await dataSource.query(
          `INSERT INTO workout_sets (
            workout_session_exercise_id, set_number, actual_reps, actual_duration_seconds, actual_load_kg, actual_rpe, actual_rir
          ) VALUES ($1, 1, 8, 30, -1, 8.5, 2)`,
          [exerciseRow.id],
        );
        throw new Error('expected set checks to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      expect(admin.id).toBeTruthy();
    });
  });
});
