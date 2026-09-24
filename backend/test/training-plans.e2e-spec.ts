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
import { ExerciseStatus } from '../src/modules/exercises/enums/exercise-status.enum';
import { TrainingPlanExercise } from '../src/modules/training-plans/entities/training-plan-exercise.entity';
import { TrainingPlan } from '../src/modules/training-plans/entities/training-plan.entity';
import { TrainingPlanWorkout } from '../src/modules/training-plans/entities/training-plan-workout.entity';
import { TrainingPlanDayOfWeek } from '../src/modules/training-plans/enums/training-plan-day-of-week.enum';
import { TrainingPlanStatus } from '../src/modules/training-plans/enums/training-plan-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
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

describe('Training plans (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let plans: Repository<TrainingPlan>;
  let planWorkouts: Repository<TrainingPlanWorkout>;
  let planExercises: Repository<TrainingPlanExercise>;
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
    plans = dataSource.getRepository(TrainingPlan);
    planWorkouts = dataSource.getRepository(TrainingPlanWorkout);
    planExercises = dataSource.getRepository(TrainingPlanExercise);
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

  describe('creation and relationship authorization', () => {
    it('lets ADMIN and assigned TRAINER create plans and rejects others plus mass assignment', async () => {
      const { authorization } = await createAdmin();
      const trainerA = await provisionTrainer(authorization);
      const trainerB = await provisionTrainer(authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainerA.id);
      const trainerAAuth = await authHeader(trainerA.user.email);
      const trainerBAuth = await authHeader(trainerB.user.email);
      const clientAuth = await authHeader(client.user.email);

      const adminCreated = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', authorization)
        .send({ name: '  Hypertrophy   Phase 1  ' })
        .expect(201);
      expect(adminCreated.body.status).toBe(TrainingPlanStatus.DRAFT);
      expect(adminCreated.body.workouts).toEqual([]);

      const trainerCreated = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAAuth)
        .send({ name: 'Trainer Plan' })
        .expect(201);
      expect(trainerCreated.body.createdByUserId).toBe(trainerA.user.id);

      await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Should 404' })
        .expect(404);

      await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', clientAuth)
        .send({ name: 'Client Plan' })
        .expect(403);

      await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .send({ name: 'Anon' })
        .expect(401);

      await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', authorization)
        .send({
          name: 'Hijack',
          clientProfileId: randomUUID(),
          trainerId: randomUUID(),
          createdByUserId: randomUUID(),
          status: TrainingPlanStatus.ACTIVE,
          activatedAt: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('snapshot isolation personalization and schedule', () => {
    it('copies template prescriptions, stays isolated after template/exercise changes, and personalizes load', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const bench = await createExercise(trainerAuth, {
        name: 'Barbell Bench Press',
      });
      const row = await createExercise(trainerAuth, {
        name: 'Cable Row',
        primaryMuscleGroup: ExerciseMuscleGroup.BACK,
        equipmentType: ExerciseEquipmentType.CABLE,
      });
      const push = await createUsableTemplate(trainerAuth, 'Push Day', [
        repsItem(bench),
      ]);
      const pull = await createUsableTemplate(trainerAuth, 'Pull Day', [
        repsItem(row, { sets: 3, repsMin: 10, repsMax: 12, targetRir: 1 }),
      ]);

      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Phase 1', startDate: '2026-09-07' })
        .expect(201);
      const planId = readId(plan.body);

      const snapshotted = await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({
          workouts: [
            {
              workoutTemplateId: push,
              scheduledDay: TrainingPlanDayOfWeek.MONDAY,
            },
            {
              workoutTemplateId: pull,
              scheduledDay: TrainingPlanDayOfWeek.THURSDAY,
            },
          ],
        })
        .expect(200);

      expect(
        snapshotted.body.workouts.map(
          (workout: {
            position: number;
            name: string;
            sourceWorkoutTemplateId: string;
          }) => [
            workout.position,
            workout.name,
            workout.sourceWorkoutTemplateId,
          ],
        ),
      ).toEqual([
        [1, 'Push Day', push],
        [2, 'Pull Day', pull],
      ]);
      expect(snapshotted.body.workouts[0].exercises[0]).toMatchObject({
        exerciseId: bench,
        exerciseName: 'Barbell Bench Press',
        sets: 4,
        repsMin: 8,
        repsMax: 10,
        targetRir: 2,
        targetLoadKg: null,
      });

      await request(http)
        .put(`/api/v1/workout-templates/${push}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            repsItem(bench, { sets: 5, repsMin: 5, repsMax: 5, targetRir: 1 }),
          ],
        })
        .expect(200);

      await request(http)
        .patch(`/api/v1/exercises/${bench}`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Competition Bench Press' })
        .expect(200);

      const afterTemplateEdit = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(afterTemplateEdit.body.workouts[0].exercises[0]).toMatchObject({
        exerciseId: bench,
        exerciseName: 'Barbell Bench Press',
        sets: 4,
        repsMin: 8,
        repsMax: 10,
        targetRir: 2,
      });

      const planExerciseId = afterTemplateEdit.body.workouts[0].exercises[0]
        .id as string;
      const personalized = await request(http)
        .patch(
          `/api/v1/clients/${client.id}/training-plans/${planId}/exercises/${planExerciseId}`,
        )
        .set('Authorization', trainerAuth)
        .send({
          sets: 5,
          repsMin: 6,
          repsMax: 8,
          targetLoadKg: 82.5,
          targetRir: 1,
        })
        .expect(200);
      expect(personalized.body.workouts[0].exercises[0]).toMatchObject({
        sets: 5,
        repsMin: 6,
        repsMax: 8,
        targetLoadKg: 82.5,
        targetRir: 1,
      });

      const templateDetail = await request(http)
        .get(`/api/v1/workout-templates/${push}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(templateDetail.body.items[0]).toMatchObject({
        sets: 5,
        repsMin: 5,
        repsMax: 5,
        targetRir: 1,
      });
      expect(templateDetail.body.items[0]).not.toHaveProperty('targetLoadKg');

      const planWorkoutId = personalized.body.workouts[0].id as string;
      const scheduled = await request(http)
        .patch(
          `/api/v1/clients/${client.id}/training-plans/${planId}/workouts/${planWorkoutId}`,
        )
        .set('Authorization', trainerAuth)
        .send({ scheduledDay: TrainingPlanDayOfWeek.TUESDAY })
        .expect(200);
      expect(scheduled.body.workouts[0].scheduledDay).toBe(
        TrainingPlanDayOfWeek.TUESDAY,
      );
      expect(scheduled.body.workouts[0].exercises[0].sets).toBe(5);

      await request(http)
        .get(`/api/v1/clients/me/training-plans/${planId}`)
        .set('Authorization', clientAuth)
        .expect(404);

      await request(http)
        .patch(`/api/v1/workout-templates/${push}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ARCHIVED })
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const current = await request(http)
        .get('/api/v1/clients/me/training-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(current.body.trainingPlan.id).toBe(planId);
      expect(
        current.body.trainingPlan.workouts[0].exercises[0].exerciseName,
      ).toBe('Barbell Bench Press');
    });
  });

  describe('reassignment, activation, client visibility and rollbacks', () => {
    it('moves access with the current trainer JWT and replaces the active plan atomically', async () => {
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
      const templateId = await createUsableTemplate(trainerAAuth, 'Full Body', [
        repsItem(exerciseId),
      ]);

      const planA = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAAuth)
        .send({ name: 'Plan A' })
        .expect(201);
      const planAId = readId(planA.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planAId}/workouts`)
        .set('Authorization', trainerAAuth)
        .send({ workouts: [{ workoutTemplateId: templateId }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planAId}/status`)
        .set('Authorization', trainerAAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerAAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .expect(404);

      await assign(authorization, client.id, trainerB.id);

      await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerAAuth)
        .expect(404);
      const asB = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(asB.body.createdByUserId).toBe(trainerA.user.id);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .send({ description: 'Now owned by relationship' })
        .expect(200);

      const planB = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Plan B' })
        .expect(201);
      const planBId = readId(planB.body);

      const clientDraftList = await request(http)
        .get('/api/v1/clients/me/training-plans')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(
        clientDraftList.body.data.map((row: { id: string }) => row.id),
      ).toEqual([planAId]);
      await request(http)
        .get(`/api/v1/clients/me/training-plans/${planBId}`)
        .set('Authorization', clientAuth)
        .expect(404);

      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planBId}/workouts`)
        .set('Authorization', trainerBAuth)
        .send({ workouts: [{ workoutTemplateId: templateId }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planBId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const activeCount = await plans.count({
        where: {
          clientProfileId: client.id,
          status: TrainingPlanStatus.ACTIVE,
        },
      });
      expect(activeCount).toBe(1);
      expect((await plans.findOneByOrFail({ id: planAId })).status).toBe(
        TrainingPlanStatus.ARCHIVED,
      );
      expect((await plans.findOneByOrFail({ id: planBId })).status).toBe(
        TrainingPlanStatus.ACTIVE,
      );

      const current = await request(http)
        .get('/api/v1/clients/me/training-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(current.body.trainingPlan.id).toBe(planBId);

      await request(http)
        .get(`/api/v1/clients/me/training-plans/${planAId}`)
        .set('Authorization', clientAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/me/training-plans/${planAId}`)
        .set('Authorization', otherAuth)
        .expect(404);

      const planC = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Invalid Plan' })
        .expect(201);
      const planCId = readId(planC.body);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planCId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(409);
      expect((await plans.findOneByOrFail({ id: planBId })).status).toBe(
        TrainingPlanStatus.ACTIVE,
      );
      expect((await plans.findOneByOrFail({ id: planCId })).status).toBe(
        TrainingPlanStatus.DRAFT,
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planBId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: TrainingPlanStatus.ARCHIVED })
        .expect(200);
      const none = await request(http)
        .get('/api/v1/clients/me/training-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(none.body.trainingPlan).toBeNull();
    });
  });

  describe('exercise archive rules and snapshot rollback', () => {
    it('blocks activation when a canonical exercise is archived, then keeps an ACTIVE plan readable after later archive', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);

      const exerciseA = await createExercise(trainerAuth, { name: 'Keep A' });
      const templateA = await createUsableTemplate(trainerAuth, 'Session A', [
        repsItem(exerciseA),
      ]);
      const planA = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Active A' })
        .expect(201);
      const planAId = readId(planA.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planAId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: templateA }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planAId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const exerciseB = await createExercise(trainerAuth, {
        name: 'Soon Archived',
      });
      const templateB = await createUsableTemplate(trainerAuth, 'Session B', [
        repsItem(exerciseB),
      ]);
      const planB = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Draft B' })
        .expect(201);
      const planBId = readId(planB.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planBId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: templateB }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/exercises/${exerciseB}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planBId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(409);
      expect((await plans.findOneByOrFail({ id: planAId })).status).toBe(
        TrainingPlanStatus.ACTIVE,
      );
      expect((await plans.findOneByOrFail({ id: planBId })).status).toBe(
        TrainingPlanStatus.DRAFT,
      );

      await request(http)
        .patch(`/api/v1/exercises/${exerciseA}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: ExerciseStatus.ARCHIVED })
        .expect(200);
      const stillActive = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(stillActive.body.status).toBe(TrainingPlanStatus.ACTIVE);
      expect(stillActive.body.workouts[0].exercises[0].exerciseName).toBe(
        'Keep A',
      );

      const exerciseC = await createExercise(trainerAuth, { name: 'Fresh C' });
      const templateC = await createUsableTemplate(trainerAuth, 'Session C', [
        repsItem(exerciseC),
      ]);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planBId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({
          workouts: [
            { workoutTemplateId: templateC },
            { workoutTemplateId: templateA },
          ],
        })
        .expect(409);
      const unchanged = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planBId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(unchanged.body.workouts).toHaveLength(1);
      expect(unchanged.body.workouts[0].sourceWorkoutTemplateId).toBe(
        templateB,
      );
    });

    it('rolls back snapshot replacement when persistence fails after delete', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseA = await createExercise(trainerAuth, { name: 'Alpha' });
      const exerciseB = await createExercise(trainerAuth, { name: 'Beta' });
      const templateA = await createUsableTemplate(trainerAuth, 'Keep', [
        repsItem(exerciseA),
      ]);
      const templateB = await createUsableTemplate(trainerAuth, 'New', [
        repsItem(exerciseB),
      ]);
      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Rollback Plan' })
        .expect(201);
      const planId = readId(plan.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: templateA }] })
        .expect(200);

      const originalTransaction = dataSource.transaction.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((runInTransaction: unknown) => {
          return originalTransaction(async (manager) => {
            const repo = manager.getRepository(TrainingPlanWorkout);
            jest
              .spyOn(repo, 'save')
              .mockRejectedValueOnce(new Error('forced workout failure'));
            return (
              runInTransaction as (m: typeof manager) => Promise<unknown>
            )(manager);
          });
        });

      try {
        await request(http)
          .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
          .set('Authorization', trainerAuth)
          .send({ workouts: [{ workoutTemplateId: templateB }] })
          .expect(500);
        const detail = await request(http)
          .get(`/api/v1/clients/${client.id}/training-plans/${planId}`)
          .set('Authorization', trainerAuth)
          .expect(200);
        expect(detail.body.workouts[0].sourceWorkoutTemplateId).toBe(templateA);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('disabled client and persistence integrity', () => {
    it('keeps historical plans and rejects mutations while the client is disabled', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push', [
        repsItem(exerciseId),
      ]);
      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Keep Me' })
        .expect(201);
      const planId = readId(plan.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: templateId }] })
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      expect(await plans.count({ where: { id: planId } })).toBe(1);
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: client.user.email, password: PASSWORD })
        .expect(401);
      await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'New' })
        .expect(409);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(409);
      await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planId}`)
        .set('Authorization', authorization)
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);
    });

    it('enforces FKs, date range, prescription CHECKs and one ACTIVE plan per client', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const exerciseId = await createExercise(trainerAuth);
      const templateId = await createUsableTemplate(trainerAuth, 'Push', [
        repsItem(exerciseId),
      ]);
      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({
          name: 'Integrity',
          startDate: '2026-09-07',
          endDate: '2026-12-01',
        })
        .expect(201);
      const planId = readId(plan.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({ workouts: [{ workoutTemplateId: templateId }] })
        .expect(200);

      try {
        await plans.save(
          plans.create({
            clientProfileId: randomUUID(),
            name: 'Ghost',
            status: TrainingPlanStatus.DRAFT,
            createdByUserId: admin.id,
          }),
        );
        throw new Error('expected missing client to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO training_plans (client_profile_id, name, status, created_by_user_id, start_date, end_date)
           VALUES ($1, $2, 'DRAFT', $3, '2026-12-01', '2026-09-01')`,
          [client.id, 'Bad Dates', admin.id],
        );
        throw new Error('expected date range to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      const workout = await planWorkouts.findOneByOrFail({
        trainingPlanId: planId,
      });
      try {
        await planExercises.save(
          planExercises.create({
            trainingPlanWorkoutId: workout.id,
            exerciseId,
            exerciseNameSnapshot: 'Dup',
            position: 1,
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 8,
            repsMax: 10,
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
          `INSERT INTO training_plan_exercises (
            training_plan_workout_id, exercise_id, exercise_name_snapshot, position, sets,
            prescription_type, reps_min, reps_max, duration_seconds, rest_seconds, target_load_kg, target_rpe, target_rir
          ) VALUES ($1, $2, 'Bad', 2, 3, 'REPS', 8, 10, NULL, 60, -1, 8.5, 2)`,
          [workout.id, exerciseId],
        );
        throw new Error('expected load/RPE/RIR checks to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      try {
        await plans.save(
          plans.create({
            clientProfileId: client.id,
            name: 'Second Active',
            status: TrainingPlanStatus.ACTIVE,
            createdByUserId: admin.id,
            activatedAt: new Date(),
            archivedAt: null,
          }),
        );
        throw new Error('expected second ACTIVE plan to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }
    });
  });
});
