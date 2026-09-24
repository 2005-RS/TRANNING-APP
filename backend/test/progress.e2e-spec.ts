import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../src/modules/exercises/enums/exercise-status.enum';
import { TrainingPlanStatus } from '../src/modules/training-plans/enums/training-plan-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { WorkoutSession } from '../src/modules/workout-sessions/entities/workout-session.entity';
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

describe('Progress (e2e)', () => {
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
    templateIds: string[],
    loadKg?: number,
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
      .send({
        workouts: templateIds.map((workoutTemplateId) => ({
          workoutTemplateId,
        })),
      })
      .expect(200);
    const detail = await request(http)
      .get(`/api/v1/clients/${clientId}/training-plans/${planId}`)
      .set('Authorization', trainerAuth)
      .expect(200);
    if (loadKg !== undefined) {
      const planExerciseId = detail.body.workouts[0].exercises[0].id as string;
      await request(http)
        .patch(
          `/api/v1/clients/${clientId}/training-plans/${planId}/exercises/${planExerciseId}`,
        )
        .set('Authorization', trainerAuth)
        .send({ targetLoadKg: loadKg })
        .expect(200);
    }
    await request(http)
      .patch(`/api/v1/clients/${clientId}/training-plans/${planId}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);
    const active = await request(http)
      .get(`/api/v1/clients/${clientId}/training-plans/${planId}`)
      .set('Authorization', trainerAuth)
      .expect(200);
    return {
      planId,
      workouts: active.body.workouts as Array<{
        id: string;
        exercises: Array<{ id: string; exerciseId: string }>;
      }>,
    };
  }

  async function runSession(
    clientAuth: string,
    planWorkoutId: string,
    setsByExercise: Array<Array<Record<string, unknown>>>,
    status: WorkoutSessionStatus = WorkoutSessionStatus.COMPLETED,
  ) {
    const started = await request(http)
      .post('/api/v1/clients/me/workout-sessions')
      .set('Authorization', clientAuth)
      .send({ trainingPlanWorkoutId: planWorkoutId })
      .expect(201);
    const sessionId = started.body.id as string;
    for (let index = 0; index < setsByExercise.length; index += 1) {
      const sessionExerciseId = started.body.exercises[index].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: setsByExercise[index] })
        .expect(200);
    }
    if (status !== WorkoutSessionStatus.IN_PROGRESS) {
      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
        .set('Authorization', clientAuth)
        .send({ status })
        .expect(200);
    }
    return sessionId;
  }

  async function setStartedAt(sessionId: string, startedAt: string) {
    await dataSource.getRepository(WorkoutSession).update(sessionId, {
      startedAt: new Date(startedAt),
    });
  }

  it('derives exact REPS and DURATION metrics from COMPLETED actuals only', async () => {
    const { authorization } = await createAdmin();
    const trainer = await provisionTrainer(authorization);
    const trainerB = await provisionTrainer(authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const client = await provisionClient(authorization);
    await assign(authorization, client.id, trainer.id);
    const trainerAuth = await authHeader(trainer.user.email);
    const trainerBAuth = await authHeader(trainerB.user.email);
    const clientAuth = await authHeader(client.user.email);

    const benchId = await createExercise(trainerAuth);
    const plankId = await createExercise(trainerAuth, {
      name: 'Plank',
      primaryMuscleGroup: ExerciseMuscleGroup.CORE,
      equipmentType: ExerciseEquipmentType.BODYWEIGHT,
    });
    const unusedId = await createExercise(trainerAuth, {
      name: 'Unused Fly',
      primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
      equipmentType: ExerciseEquipmentType.DUMBBELL,
    });

    const push = await createUsableTemplate(trainerAuth, 'Push Day', [
      repsItem(benchId),
    ]);
    const core = await createUsableTemplate(trainerAuth, 'Core', [
      durationItem(plankId),
    ]);
    const { planId, workouts } = await activatePlan(
      trainerAuth,
      client.id,
      [push, core],
      100,
    );
    const benchWorkoutId = workouts[0].id;
    const plankWorkoutId = workouts[1].id;

    const session1 = await runSession(clientAuth, benchWorkoutId, [
      [
        { actualReps: 10, actualLoadKg: 80 },
        { actualReps: 9, actualLoadKg: 80 },
        { actualReps: 8, actualLoadKg: 80 },
      ],
    ]);
    const session2 = await runSession(clientAuth, benchWorkoutId, [
      [
        { actualReps: 8, actualLoadKg: 85 },
        { actualReps: 8, actualLoadKg: 85 },
      ],
    ]);
    const session3 = await runSession(clientAuth, benchWorkoutId, [
      [{ actualReps: 5, actualLoadKg: 90 }],
    ]);
    await setStartedAt(session1, '2026-03-01T12:00:00.000Z');
    await setStartedAt(session2, '2026-03-10T12:00:00.000Z');
    await setStartedAt(session3, '2026-03-20T12:00:00.000Z');

    const plank1 = await runSession(clientAuth, plankWorkoutId, [
      [
        { actualDurationSeconds: 45 },
        { actualDurationSeconds: 45 },
        { actualDurationSeconds: 40 },
      ],
    ]);
    const plank2 = await runSession(clientAuth, plankWorkoutId, [
      [{ actualDurationSeconds: 60 }, { actualDurationSeconds: 55 }],
    ]);
    await setStartedAt(plank1, '2026-03-05T12:00:00.000Z');
    await setStartedAt(plank2, '2026-03-15T12:00:00.000Z');

    const summary = await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(summary.body).toMatchObject({
      completedSessions: 5,
      performedSets: 11,
      exercisesPerformed: 2,
      totalReps: 48,
      externalLoadVolumeKg: 3970,
      totalDurationSeconds: 245,
    });
    expect(summary.body.firstCompletedSessionAt).toBe(
      '2026-03-01T12:00:00.000Z',
    );
    expect(summary.body.lastCompletedSessionAt).toBe(
      '2026-03-20T12:00:00.000Z',
    );

    const exercises = await request(http)
      .get('/api/v1/clients/me/progress/exercises')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(exercises.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      totalItems: 2,
      totalPages: 1,
    });
    const benchRow = exercises.body.data.find(
      (row: { exerciseId: string }) => row.exerciseId === benchId,
    );
    const plankRow = exercises.body.data.find(
      (row: { exerciseId: string }) => row.exerciseId === plankId,
    );
    expect(benchRow).toMatchObject({
      exerciseName: 'Barbell Bench Press',
      exerciseStatus: ExerciseStatus.ACTIVE,
      prescriptionType: WorkoutPrescriptionType.REPS,
      completedSessions: 3,
      performedSets: 6,
      totalReps: 48,
      externalLoadVolumeKg: 3970,
      bestLoadKg: 90,
      bestReps: 10,
      bestEstimated1RmKg: 107.67,
    });
    expect(plankRow).toMatchObject({
      exerciseName: 'Plank',
      prescriptionType: WorkoutPrescriptionType.DURATION,
      completedSessions: 2,
      performedSets: 5,
      totalDurationSeconds: 245,
      bestDurationSeconds: 60,
      totalReps: null,
      externalLoadVolumeKg: null,
      bestLoadKg: null,
      bestEstimated1RmKg: null,
    });

    const detail = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(detail.body.exerciseName).toBe('Barbell Bench Press');
    expect(detail.body.availablePrescriptionTypes).toEqual([
      WorkoutPrescriptionType.REPS,
    ]);
    expect(detail.body.duration).toBeNull();
    expect(detail.body.reps).toMatchObject({
      completedSessions: 3,
      performedSets: 6,
      totalReps: 48,
      externalLoadVolumeKg: 3970,
      bestLoadKg: 90,
      bestReps: 10,
      bestEstimated1RmKg: 107.67,
    });
    expect(detail.body.reps.bestEstimated1Rm).toMatchObject({
      value: 107.67,
      actualLoadKg: 85,
      actualReps: 8,
      workoutSessionId: session2,
    });
    expect(detail.body.reps.history.data[0].workoutSessionId).toBe(session3);
    expect(detail.body.reps.history.data[0].bestEstimated1RmKg).toBe(105);
    expect(detail.body.reps.trend[0]).toMatchObject({
      workoutSessionId: session3,
      bestLoadKg: 90,
      bestEstimated1RmKg: 105,
      externalLoadVolumeKg: 450,
      totalReps: 5,
    });

    await request(http)
      .get(`/api/v1/clients/${client.id}/progress/summary`)
      .set('Authorization', trainerAuth)
      .expect(200)
      .expect((res) => {
        expect(res.body.externalLoadVolumeKg).toBe(3970);
      });
    await request(http)
      .get(`/api/v1/clients/${client.id}/progress/summary`)
      .set('Authorization', trainerBAuth)
      .expect(404);

    const cancelled = await runSession(
      clientAuth,
      benchWorkoutId,
      [[{ actualReps: 10, actualLoadKg: 200 }]],
      WorkoutSessionStatus.CANCELLED,
    );
    const inProgress = await runSession(
      clientAuth,
      benchWorkoutId,
      [[{ actualReps: 10, actualLoadKg: 250 }]],
      WorkoutSessionStatus.IN_PROGRESS,
    );
    expect(cancelled).toBeTruthy();
    expect(inProgress).toBeTruthy();

    const afterNoise = await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(afterNoise.body).toMatchObject({
      completedSessions: 5,
      performedSets: 11,
      totalReps: 48,
      externalLoadVolumeKg: 3970,
    });
    const benchAfterNoise = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(benchAfterNoise.body.reps.bestLoadKg).toBe(90);
    expect(benchAfterNoise.body.reps.bestEstimated1RmKg).toBe(107.67);

    await request(http)
      .patch(`/api/v1/clients/me/workout-sessions/${inProgress}/status`)
      .set('Authorization', clientAuth)
      .send({ status: WorkoutSessionStatus.CANCELLED })
      .expect(200);

    const highRep = await runSession(clientAuth, benchWorkoutId, [
      [{ actualReps: 15, actualLoadKg: 60 }],
    ]);
    await setStartedAt(highRep, '2026-03-25T12:00:00.000Z');
    const afterHighRep = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(afterHighRep.body.reps.bestEstimated1RmKg).toBe(107.67);
    expect(afterHighRep.body.reps.bestReps).toBe(15);
    expect(afterHighRep.body.reps.totalReps).toBe(63);

    const ranged = await request(http)
      .get(
        '/api/v1/clients/me/progress/summary?dateFrom=2026-03-10&dateTo=2026-03-10',
      )
      .set('Authorization', clientAuth)
      .expect(200);
    expect(ranged.body).toMatchObject({
      completedSessions: 1,
      performedSets: 2,
      exercisesPerformed: 1,
      totalReps: 16,
      externalLoadVolumeKg: 1360,
      totalDurationSeconds: 0,
    });

    await request(http)
      .patch(`/api/v1/exercises/${benchId}`)
      .set('Authorization', trainerAuth)
      .send({ name: 'Competition Bench Press' })
      .expect(200);
    const renamed = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(renamed.body.exerciseName).toBe('Competition Bench Press');
    expect(renamed.body.reps.history.data[0].exerciseNameSnapshot).toBe(
      'Barbell Bench Press',
    );

    await request(http)
      .patch(`/api/v1/exercises/${benchId}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: ExerciseStatus.ARCHIVED })
      .expect(200);
    const archived = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(archived.body.exerciseStatus).toBe(ExerciseStatus.ARCHIVED);
    expect(archived.body.reps.bestLoadKg).toBe(90);

    await request(http)
      .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: TrainingPlanStatus.ARCHIVED })
      .expect(200);
    const afterArchive = await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(afterArchive.body.completedSessions).toBe(6);

    await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${unusedId}`)
      .set('Authorization', clientAuth)
      .expect(404);

    const explain = (await dataSource.query(
      `
      EXPLAIN
      SELECT s.id
      FROM workout_sessions s
      INNER JOIN workout_session_exercises wse ON wse.workout_session_id = s.id
      INNER JOIN workout_sets set_row ON set_row.workout_session_exercise_id = wse.id
      INNER JOIN exercises e ON e.id = wse.exercise_id
      WHERE s.client_profile_id = $1
        AND s.status = 'COMPLETED'
        AND wse.exercise_id = $2
        AND wse.prescription_type = 'REPS'
      GROUP BY s.id, s.workout_name_snapshot, s.started_at
      ORDER BY s.started_at DESC, s.id ASC
      LIMIT 20
      `,
      [client.id, benchId],
    )) as Array<{ 'QUERY PLAN': string }>;
    const planText = explain.map((row) => row['QUERY PLAN']).join('\n');
    expect(planText).not.toMatch(/Cartesian Product/i);
    expect(planText).toMatch(/workout_sessions|workout_session_exercises/);

    const indexes = (await dataSource.query(
      `SELECT indexname FROM pg_indexes
       WHERE indexname = 'IDX_workout_session_exercises_exercise_id'`,
    )) as Array<{ indexname: string }>;
    expect(indexes).toHaveLength(1);
  });

  it('counts null-load reps without volume or 1RM and treats zero load as zero volume', async () => {
    const { authorization } = await createAdmin();
    const trainer = await provisionTrainer(authorization);
    const client = await provisionClient(authorization);
    await assign(authorization, client.id, trainer.id);
    const trainerAuth = await authHeader(trainer.user.email);
    const clientAuth = await authHeader(client.user.email);
    const squatId = await createExercise(trainerAuth, {
      name: 'Bodyweight Squat',
      equipmentType: ExerciseEquipmentType.BODYWEIGHT,
    });
    const templateId = await createUsableTemplate(trainerAuth, 'Legs', [
      repsItem(squatId),
    ]);
    const { workouts } = await activatePlan(trainerAuth, client.id, [
      templateId,
    ]);

    await runSession(clientAuth, workouts[0].id, [
      [{ actualReps: 15 }, { actualReps: 20, actualLoadKg: 0 }],
    ]);

    const detail = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${squatId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(detail.body.reps).toMatchObject({
      totalReps: 35,
      externalLoadVolumeKg: 0,
      bestLoadKg: 0,
      bestReps: 20,
      bestEstimated1RmKg: null,
      bestEstimated1Rm: null,
    });
  });

  it('keeps mixed REPS and DURATION history as separate exerciseId + prescriptionType rows', async () => {
    const { authorization } = await createAdmin();
    const trainer = await provisionTrainer(authorization);
    const client = await provisionClient(authorization);
    await assign(authorization, client.id, trainer.id);
    const trainerAuth = await authHeader(trainer.user.email);
    const clientAuth = await authHeader(client.user.email);
    const hybridId = await createExercise(trainerAuth, {
      name: 'Hybrid Hold',
      primaryMuscleGroup: ExerciseMuscleGroup.CORE,
      equipmentType: ExerciseEquipmentType.BODYWEIGHT,
    });
    const templateId = await createUsableTemplate(trainerAuth, 'Mixed', [
      repsItem(hybridId, { sets: 1, repsMin: 5, repsMax: 8 }),
      durationItem(hybridId, { sets: 1 }),
    ]);
    const { workouts } = await activatePlan(trainerAuth, client.id, [
      templateId,
    ]);

    await runSession(clientAuth, workouts[0].id, [
      [{ actualReps: 6, actualLoadKg: 20 }],
      [{ actualDurationSeconds: 40 }],
    ]);

    const list = await request(http)
      .get('/api/v1/clients/me/progress/exercises')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(list.body.meta.totalItems).toBe(2);
    const types = list.body.data.map(
      (row: { prescriptionType: string }) => row.prescriptionType,
    );
    expect(types.sort()).toEqual([
      WorkoutPrescriptionType.DURATION,
      WorkoutPrescriptionType.REPS,
    ]);

    const both = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${hybridId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(both.body.reps.totalReps).toBe(6);
    expect(both.body.duration.totalDurationSeconds).toBe(40);
    expect(both.body.reps.totalDurationSeconds).toBeUndefined();
    expect(both.body.availablePrescriptionTypes).toEqual([
      WorkoutPrescriptionType.REPS,
      WorkoutPrescriptionType.DURATION,
    ]);
  });

  it('counts one completed session when the same exercise appears twice', async () => {
    const { authorization } = await createAdmin();
    const trainer = await provisionTrainer(authorization);
    const client = await provisionClient(authorization);
    await assign(authorization, client.id, trainer.id);
    const trainerAuth = await authHeader(trainer.user.email);
    const clientAuth = await authHeader(client.user.email);
    const benchId = await createExercise(trainerAuth);
    const templateId = await createUsableTemplate(trainerAuth, 'Double Bench', [
      repsItem(benchId, { sets: 1 }),
      repsItem(benchId, { sets: 1, repsMin: 5, repsMax: 6 }),
    ]);
    const { workouts } = await activatePlan(trainerAuth, client.id, [
      templateId,
    ]);

    await runSession(clientAuth, workouts[0].id, [
      [{ actualReps: 8, actualLoadKg: 70 }],
      [{ actualReps: 6, actualLoadKg: 75 }],
    ]);

    const detail = await request(http)
      .get(`/api/v1/clients/me/progress/exercises/${benchId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(detail.body.reps.completedSessions).toBe(1);
    expect(detail.body.reps.performedSets).toBe(2);
    expect(detail.body.reps.totalReps).toBe(14);
    expect(detail.body.reps.history.data).toHaveLength(1);
    expect(detail.body.reps.history.data[0].occurrences).toHaveLength(2);
  });

  it('enforces self-route ordering, current assignment, and zero-history 200', async () => {
    const { authorization } = await createAdmin();
    const trainerA = await provisionTrainer(authorization);
    const trainerB = await provisionTrainer(authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const clientX = await provisionClient(authorization);
    const clientY = await provisionClient(authorization, {
      email: 'client-y@example.com',
      firstName: 'Yves',
    });
    await assign(authorization, clientX.id, trainerA.id);
    const trainerAAuth = await authHeader(trainerA.user.email);
    const trainerBAuth = await authHeader(trainerB.user.email);
    const clientXAuth = await authHeader(clientX.user.email);
    const clientYAuth = await authHeader(clientY.user.email);

    const benchId = await createExercise(trainerAAuth);
    const templateId = await createUsableTemplate(trainerAAuth, 'Push', [
      repsItem(benchId),
    ]);
    const { workouts } = await activatePlan(
      trainerAAuth,
      clientX.id,
      [templateId],
      80,
    );
    await runSession(clientXAuth, workouts[0].id, [
      [{ actualReps: 5, actualLoadKg: 90 }],
    ]);

    await request(http).get('/api/v1/clients/me/progress/summary').expect(401);
    await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', authorization)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', trainerAAuth)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', clientXAuth)
      .expect(200);

    await request(http)
      .get(`/api/v1/clients/${clientX.id}/progress/summary`)
      .set('Authorization', clientXAuth)
      .expect(403);
    await request(http)
      .get(`/api/v1/clients/${clientY.id}/progress/summary`)
      .set('Authorization', clientXAuth)
      .expect(403);
    await request(http)
      .get(`/api/v1/clients/${clientY.id}/progress/summary`)
      .set('Authorization', trainerAAuth)
      .expect(404);

    const empty = await request(http)
      .get('/api/v1/clients/me/progress/summary')
      .set('Authorization', clientYAuth)
      .expect(200);
    expect(empty.body).toMatchObject({
      completedSessions: 0,
      performedSets: 0,
      exercisesPerformed: 0,
      totalReps: 0,
      externalLoadVolumeKg: 0,
      totalDurationSeconds: 0,
      firstCompletedSessionAt: null,
      lastCompletedSessionAt: null,
    });
    const emptyList = await request(http)
      .get('/api/v1/clients/me/progress/exercises')
      .set('Authorization', clientYAuth)
      .expect(200);
    expect(emptyList.body.data).toEqual([]);
    expect(emptyList.body.meta.totalItems).toBe(0);

    await request(http)
      .get(
        '/api/v1/clients/me/progress/summary?dateFrom=2026-02-01&dateTo=2026-01-01',
      )
      .set('Authorization', clientXAuth)
      .expect(400);

    const before = await request(http)
      .get(`/api/v1/clients/${clientX.id}/progress/summary`)
      .set('Authorization', trainerAAuth)
      .expect(200);
    expect(before.body.totalReps).toBe(5);
    await request(http)
      .get(`/api/v1/clients/${clientX.id}/progress/summary`)
      .set('Authorization', trainerBAuth)
      .expect(404);

    await assign(authorization, clientX.id, trainerB.id);
    await request(http)
      .get(`/api/v1/clients/${clientX.id}/progress/summary`)
      .set('Authorization', trainerAAuth)
      .expect(404);
    const after = await request(http)
      .get(`/api/v1/clients/${clientX.id}/progress/summary`)
      .set('Authorization', trainerBAuth)
      .expect(200);
    expect(after.body.totalReps).toBe(5);
    expect(after.body.externalLoadVolumeKg).toBe(450);
  });
});
