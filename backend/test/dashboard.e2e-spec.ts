import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { ActivityEvent } from '../src/modules/activity-events/entities/activity-event.entity';
import { ActivityEventEntityType } from '../src/modules/activity-events/enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../src/modules/activity-events/enums/activity-event-type.enum';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { CheckInStatus } from '../src/modules/check-ins/enums/check-in-status.enum';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { NutritionMealType } from '../src/modules/nutrition-plans/enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../src/modules/nutrition-plans/enums/nutrition-plan-status.enum';
import { TrainingPlanDayOfWeek } from '../src/modules/training-plans/enums/training-plan-day-of-week.enum';
import { TrainingPlanStatus } from '../src/modules/training-plans/enums/training-plan-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { WorkoutPrescriptionType } from '../src/modules/workout-templates/enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../src/modules/workout-templates/enums/workout-template-status.enum';
import { WorkoutSessionStatus } from '../src/modules/workout-sessions/enums/workout-session-status.enum';
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

describe('Dashboards (e2e)', () => {
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

  async function createActivatableTrainingPlan(
    authorization: string,
    clientId: string,
    name: string,
  ): Promise<{ planId: string; planWorkoutId: string }> {
    const exercise = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', authorization)
      .send({
        name: `${name} Bench`,
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      })
      .expect(201);
    const template = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', authorization)
      .send({ name: `${name} Template` })
      .expect(201);
    const templateId = readId(template.body);
    await request(http)
      .put(`/api/v1/workout-templates/${templateId}/exercises`)
      .set('Authorization', authorization)
      .send({
        items: [
          {
            exerciseId: readId(exercise.body),
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 8,
            repsMax: 10,
            restSeconds: 90,
            targetRir: 2,
          },
        ],
      })
      .expect(200);
    await request(http)
      .patch(`/api/v1/workout-templates/${templateId}/status`)
      .set('Authorization', authorization)
      .send({ status: WorkoutTemplateStatus.ACTIVE })
      .expect(200);

    const plan = await request(http)
      .post(`/api/v1/clients/${clientId}/training-plans`)
      .set('Authorization', authorization)
      .send({ name })
      .expect(201);
    const planId = readId(plan.body);
    await request(http)
      .put(`/api/v1/clients/${clientId}/training-plans/${planId}/workouts`)
      .set('Authorization', authorization)
      .send({
        workouts: [
          {
            workoutTemplateId: templateId,
            scheduledDay: TrainingPlanDayOfWeek.MONDAY,
          },
        ],
      })
      .expect(200);
    const detail = await request(http)
      .get(`/api/v1/clients/${clientId}/training-plans/${planId}`)
      .set('Authorization', authorization)
      .expect(200);
    return { planId, planWorkoutId: detail.body.workouts[0].id as string };
  }

  async function activateTrainingPlan(
    authorization: string,
    clientId: string,
    planId: string,
  ) {
    await request(http)
      .patch(`/api/v1/clients/${clientId}/training-plans/${planId}/status`)
      .set('Authorization', authorization)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);
  }

  async function archiveTrainingPlan(
    authorization: string,
    clientId: string,
    planId: string,
  ) {
    await request(http)
      .patch(`/api/v1/clients/${clientId}/training-plans/${planId}/status`)
      .set('Authorization', authorization)
      .send({ status: TrainingPlanStatus.ARCHIVED })
      .expect(200);
  }

  async function createActivatableNutritionPlan(
    authorization: string,
    clientId: string,
    name: string,
  ): Promise<string> {
    const food = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', authorization)
      .send({
        name: `${name} Chicken`,
        caloriesPer100g: 165,
        proteinGPer100g: 31,
        carbohydratesGPer100g: 0,
        fatGPer100g: 3.6,
      })
      .expect(201);
    const plan = await request(http)
      .post(`/api/v1/clients/${clientId}/nutrition-plans`)
      .set('Authorization', authorization)
      .send({ name, targetCaloriesKcal: 2200 })
      .expect(201);
    const planId = readId(plan.body);
    await request(http)
      .put(`/api/v1/clients/${clientId}/nutrition-plans/${planId}/meals`)
      .set('Authorization', authorization)
      .send({
        meals: [
          {
            name: 'Lunch',
            mealType: NutritionMealType.LUNCH,
            items: [{ foodId: readId(food.body), quantityGrams: 150 }],
          },
        ],
      })
      .expect(200);
    return planId;
  }

  async function activateNutritionPlan(
    authorization: string,
    clientId: string,
    planId: string,
  ) {
    await request(http)
      .patch(`/api/v1/clients/${clientId}/nutrition-plans/${planId}/status`)
      .set('Authorization', authorization)
      .send({ status: NutritionPlanStatus.ACTIVE })
      .expect(200);
  }

  async function archiveNutritionPlan(
    authorization: string,
    clientId: string,
    planId: string,
  ) {
    await request(http)
      .patch(`/api/v1/clients/${clientId}/nutrition-plans/${planId}/status`)
      .set('Authorization', authorization)
      .send({ status: NutritionPlanStatus.ARCHIVED })
      .expect(200);
  }

  async function completeSession(
    clientAuth: string,
    planWorkoutId: string,
  ): Promise<{ sessionId: string; exerciseCount: number; setCount: number }> {
    const started = await request(http)
      .post('/api/v1/clients/me/workout-sessions')
      .set('Authorization', clientAuth)
      .send({ trainingPlanWorkoutId: planWorkoutId })
      .expect(201);
    const sessionId = readId(started.body);
    const exerciseId = started.body.exercises[0].id as string;
    await request(http)
      .put(
        `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${exerciseId}/sets`,
      )
      .set('Authorization', clientAuth)
      .send({
        sets: [
          { actualReps: 10, actualLoadKg: 80 },
          { actualReps: 8, actualLoadKg: 80 },
        ],
      })
      .expect(200);
    await request(http)
      .patch(`/api/v1/clients/me/workout-sessions/${sessionId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: WorkoutSessionStatus.COMPLETED })
      .expect(200);
    return { sessionId, exerciseCount: 1, setCount: 2 };
  }

  async function backdateSession(
    sessionId: string,
    startedAt: Date,
    completedAt: Date,
  ) {
    await dataSource.query(
      `UPDATE workout_sessions
       SET started_at = $1, completed_at = $2
       WHERE id = $3`,
      [startedAt, completedAt, sessionId],
    );
  }

  async function seedNotification(input: {
    recipientUserId: string;
    actorUserId: string;
    clientProfileId: string;
    readAt?: Date | null;
  }): Promise<Notification> {
    const events = dataSource.getRepository(ActivityEvent);
    const notifications = dataSource.getRepository(Notification);
    const event = await events.save(
      events.create({
        type: ActivityEventType.CHECK_IN_SUBMITTED,
        actorUserId: input.actorUserId,
        clientProfileId: input.clientProfileId,
        relatedEntityType: ActivityEventEntityType.CHECK_IN,
        relatedEntityId: randomUUID(),
      }),
    );
    return notifications.save(
      notifications.create({
        activityEventId: event.id,
        recipientUserId: input.recipientUserId,
        readAt: input.readAt ?? null,
      }),
    );
  }

  function idsOf(items: unknown): string[] {
    if (!Array.isArray(items)) {
      throw new Error('expected an array');
    }
    return items
      .map((item) => {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('clientProfileId' in item) ||
          typeof item.clientProfileId !== 'string'
        ) {
          throw new Error('expected clientProfileId');
        }
        return item.clientProfileId;
      })
      .sort();
  }

  describe('role matrix and route ordering', () => {
    it('enforces CLIENT/TRAINER/ADMIN isolation and 401 anonymous', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      await request(http).get('/api/v1/clients/me/dashboard').expect(401);
      await request(http).get('/api/v1/trainers/me/dashboard').expect(401);
      await request(http).get('/api/v1/admin/dashboard').expect(401);

      await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', clientAuth)
        .expect(200);
      await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', clientAuth)
        .expect(403);
      await request(http)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', clientAuth)
        .expect(403);

      await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', trainerAuth)
        .expect(200);
      await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', trainerAuth)
        .expect(403);
      await request(http)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', trainerAuth)
        .expect(403);

      await request(http)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', admin.authorization)
        .expect(200);
      await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', admin.authorization)
        .expect(403);
      await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', admin.authorization)
        .expect(403);
    });
  });

  describe('client dashboard', () => {
    it('returns 200 zero-state for a new Client', async () => {
      const admin = await createAdmin();
      const client = await provisionClient(admin.authorization);
      const clientAuth = await authHeader(client.user.email);

      const response = await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', clientAuth)
        .expect(200);

      expect(response.body.periodDays).toBe(30);
      expect(response.body.trainingPlan).toBeNull();
      expect(response.body.nutritionPlan).toBeNull();
      expect(response.body.currentWorkoutSession).toBeNull();
      expect(response.body.recentTraining.completedSessions).toEqual([]);
      expect(response.body.performance).toEqual({
        completedSessions: 0,
        performedSets: 0,
        totalReps: 0,
        externalLoadVolumeKg: 0,
        totalDurationSeconds: 0,
        exercisesPerformed: 0,
      });
      expect(response.body.bodyProgress).toBeNull();
      expect(response.body.checkIn).toBeNull();
      expect(response.body.notifications).toEqual({ unreadCount: 0 });
      expect(JSON.stringify(response.body)).not.toContain('signedUrl');
    });

    it('returns seeded sections, current session lifecycle, period window, delta, and unread count', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const training = await createActivatableTrainingPlan(
        trainerAuth,
        client.id,
        'Hypertrophy Phase 1',
      );
      await activateTrainingPlan(trainerAuth, client.id, training.planId);
      const nutritionId = await createActivatableNutritionPlan(
        trainerAuth,
        client.id,
        'Growth Plan',
      );
      await activateNutritionPlan(trainerAuth, client.id, nutritionId);

      const outside30 = await completeSession(
        clientAuth,
        training.planWorkoutId,
      );
      await backdateSession(
        outside30.sessionId,
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );
      const inside30 = await completeSession(
        clientAuth,
        training.planWorkoutId,
      );
      await backdateSession(
        inside30.sessionId,
        new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );
      const inside7 = await completeSession(clientAuth, training.planWorkoutId);
      await backdateSession(
        inside7.sessionId,
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );

      await request(http)
        .post('/api/v1/clients/me/body-measurements')
        .set('Authorization', clientAuth)
        .send({
          bodyWeightKg: 83,
          waistCm: 85,
          measuredAt: '2026-08-01T12:00:00.000Z',
        })
        .expect(201);
      await request(http)
        .post('/api/v1/clients/me/body-measurements')
        .set('Authorization', clientAuth)
        .send({
          bodyWeightKg: 82.2,
          waistCm: 84,
          measuredAt: '2026-09-01T12:00:00.000Z',
        })
        .expect(201);

      const checkIn = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
          wins: 'Private win text',
        })
        .expect(201);
      const checkInId = readId(checkIn.body);
      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);
      await request(http)
        .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({ feedback: 'Private trainer feedback' })
        .expect(201);

      await request(http)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', clientAuth)
        .expect(200);

      const unread = [];
      for (let i = 0; i < 3; i += 1) {
        unread.push(
          await seedNotification({
            recipientUserId: client.user.id,
            actorUserId: trainer.user.id,
            clientProfileId: client.id,
          }),
        );
      }

      const started = await request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: training.planWorkoutId })
        .expect(201);
      const inProgressId = readId(started.body);

      const inProgressDash = await request(http)
        .get('/api/v1/clients/me/dashboard?periodDays=30')
        .set('Authorization', clientAuth)
        .expect(200);

      expect(inProgressDash.body.trainingPlan.id).toBe(training.planId);
      expect(inProgressDash.body.trainingPlan.name).toBe('Hypertrophy Phase 1');
      expect(inProgressDash.body.trainingPlan.workoutCount).toBe(1);
      expect(inProgressDash.body.nutritionPlan.id).toBe(nutritionId);
      expect(inProgressDash.body.nutritionPlan.targetCaloriesKcal).toBe(2200);
      expect(inProgressDash.body.nutritionPlan.mealCount).toBe(1);
      expect(inProgressDash.body.currentWorkoutSession.sessionId).toBe(
        inProgressId,
      );
      expect(inProgressDash.body.currentWorkoutSession.exerciseCount).toBe(1);
      expect(inProgressDash.body.currentWorkoutSession.recordedSetCount).toBe(
        0,
      );
      expect(inProgressDash.body.performance.completedSessions).toBe(2);
      expect(inProgressDash.body.performance.performedSets).toBe(4);
      expect(inProgressDash.body.performance.totalReps).toBe(36);
      expect(inProgressDash.body.performance.externalLoadVolumeKg).toBe(2880);
      expect(inProgressDash.body.bodyProgress.bodyWeightKg).toBe(82.2);
      expect(inProgressDash.body.bodyProgress.previousBodyWeightKg).toBe(83);
      expect(inProgressDash.body.bodyProgress.bodyWeightChangeKg).toBe(-0.8);
      expect(inProgressDash.body.checkIn.id).toBe(checkInId);
      expect(inProgressDash.body.checkIn.status).toBe(CheckInStatus.REVIEWED);
      expect(inProgressDash.body.checkIn.hasReview).toBe(true);
      expect(inProgressDash.body.checkIn).not.toHaveProperty('wins');
      expect(inProgressDash.body.checkIn).not.toHaveProperty('feedback');
      expect(inProgressDash.body.notifications.unreadCount).toBe(3);
      expect(JSON.stringify(inProgressDash.body)).not.toContain('signedUrl');
      expect(JSON.stringify(inProgressDash.body)).not.toContain(
        'Private trainer feedback',
      );

      const seven = await request(http)
        .get('/api/v1/clients/me/dashboard?periodDays=7')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(seven.body.performance.completedSessions).toBe(1);
      expect(seven.body.performance.performedSets).toBe(2);
      expect(seven.body.performance.totalReps).toBe(18);

      await request(http)
        .get('/api/v1/clients/me/dashboard?periodDays=10000')
        .set('Authorization', clientAuth)
        .expect(400);

      const exerciseId = started.body.exercises[0].id as string;
      await request(http)
        .put(
          `/api/v1/clients/me/workout-sessions/${inProgressId}/exercises/${exerciseId}/sets`,
        )
        .set('Authorization', clientAuth)
        .send({ sets: [{ actualReps: 10, actualLoadKg: 80 }] })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/me/workout-sessions/${inProgressId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: WorkoutSessionStatus.COMPLETED })
        .expect(200);

      const afterComplete = await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(afterComplete.body.currentWorkoutSession).toBeNull();
      expect(
        afterComplete.body.recentTraining.completedSessions.some(
          (row: { id: string }) => row.id === inProgressId,
        ),
      ).toBe(true);

      await request(http)
        .patch(`/api/v1/notifications/${unread[0].id}/read`)
        .set('Authorization', clientAuth)
        .expect(200);
      const afterRead = await request(http)
        .get('/api/v1/clients/me/dashboard')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(afterRead.body.notifications.unreadCount).toBe(2);
      const stillUnread = await dataSource.getRepository(Notification).find({
        where: { recipientUserId: client.user.id },
      });
      expect(stillUnread.filter((row) => row.readAt === null)).toHaveLength(2);
    });
  });

  describe('trainer dashboard', () => {
    it('returns zero-state for a trainer with no assigned clients', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const trainerAuth = await authHeader(trainer.user.email);

      const response = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(response.body.activeClientCount).toBe(0);
      expect(response.body.disabledAssignedClientCount).toBe(0);
      expect(response.body.pendingCheckIns).toEqual({ count: 0, items: [] });
      expect(response.body.clientsWithoutRecentTraining.count).toBe(0);
      expect(response.body.clientsWithoutActiveTrainingPlan.count).toBe(0);
      expect(response.body.clientsWithoutActiveNutritionPlan.count).toBe(0);
      expect(response.body.recentCompletedSessions).toEqual([]);
      expect(response.body.notifications.unreadCount).toBe(0);
    });

    it('scopes operational lists, inactivity, missing plans, pending review, and reassignment', async () => {
      const admin = await createAdmin();
      const trainerA = await provisionTrainer(admin.authorization);
      const trainerB = await provisionTrainer(admin.authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
        lastName: 'Beta',
      });
      const clientPending = await provisionClient(admin.authorization, {
        email: 'pending@example.com',
        firstName: 'Pat',
        lastName: 'Pending',
      });
      const clientInactive = await provisionClient(admin.authorization, {
        email: 'inactive@example.com',
        firstName: 'Ian',
        lastName: 'Inactive',
      });
      const clientNoTraining = await provisionClient(admin.authorization, {
        email: 'no-training@example.com',
        firstName: 'Nina',
        lastName: 'Noplan',
      });
      const clientNoNutrition = await provisionClient(admin.authorization, {
        email: 'no-nutrition@example.com',
        firstName: 'Ned',
        lastName: 'Nofood',
      });
      await assign(admin.authorization, clientPending.id, trainerA.id);
      await assign(admin.authorization, clientInactive.id, trainerA.id);
      await assign(admin.authorization, clientNoTraining.id, trainerA.id);
      await assign(admin.authorization, clientNoNutrition.id, trainerA.id);
      const authA = await authHeader(trainerA.user.email);
      const authB = await authHeader(trainerB.user.email);
      const pendingAuth = await authHeader(clientPending.user.email);
      const inactiveAuth = await authHeader(clientInactive.user.email);
      const noNutritionAuth = await authHeader(clientNoNutrition.user.email);

      const pendingPlan = await createActivatableTrainingPlan(
        authA,
        clientPending.id,
        'Pending Plan',
      );
      await activateTrainingPlan(authA, clientPending.id, pendingPlan.planId);
      const pendingNutrition = await createActivatableNutritionPlan(
        authA,
        clientPending.id,
        'Pending Food',
      );
      await activateNutritionPlan(authA, clientPending.id, pendingNutrition);
      await completeSession(pendingAuth, pendingPlan.planWorkoutId);

      const inactivePlan = await createActivatableTrainingPlan(
        authA,
        clientInactive.id,
        'Inactive Plan',
      );
      await activateTrainingPlan(authA, clientInactive.id, inactivePlan.planId);
      const inactiveNutrition = await createActivatableNutritionPlan(
        authA,
        clientInactive.id,
        'Inactive Food',
      );
      await activateNutritionPlan(authA, clientInactive.id, inactiveNutrition);
      const oldSession = await completeSession(
        inactiveAuth,
        inactivePlan.planWorkoutId,
      );
      await backdateSession(
        oldSession.sessionId,
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );

      const noTrainingNutrition = await createActivatableNutritionPlan(
        authA,
        clientNoTraining.id,
        'Only Food',
      );
      await activateNutritionPlan(
        authA,
        clientNoTraining.id,
        noTrainingNutrition,
      );

      const noNutritionPlan = await createActivatableTrainingPlan(
        authA,
        clientNoNutrition.id,
        'Only Lifting',
      );
      await activateTrainingPlan(
        authA,
        clientNoNutrition.id,
        noNutritionPlan.planId,
      );
      await completeSession(noNutritionAuth, noNutritionPlan.planWorkoutId);

      const createdCheckIn = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', pendingAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
          wins: 'Should not appear on dashboard',
        })
        .expect(201);
      const pendingCheckInId = readId(createdCheckIn.body);
      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${pendingCheckInId}/status`)
        .set('Authorization', pendingAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const dashA = await request(http)
        .get('/api/v1/trainers/me/dashboard?inactivityDays=7')
        .set('Authorization', authA)
        .expect(200);
      expect(dashA.body.activeClientCount).toBe(4);
      expect(dashA.body.pendingCheckIns.count).toBe(1);
      expect(dashA.body.pendingCheckIns.items[0].checkInId).toBe(
        pendingCheckInId,
      );
      expect(dashA.body.pendingCheckIns.items[0].clientProfileId).toBe(
        clientPending.id,
      );
      expect(JSON.stringify(dashA.body.pendingCheckIns)).not.toContain(
        'Should not appear on dashboard',
      );
      expect(idsOf(dashA.body.clientsWithoutRecentTraining.items)).toEqual(
        [clientInactive.id, clientNoTraining.id].sort(),
      );
      expect(dashA.body.clientsWithoutRecentTraining.count).toBe(2);
      expect(idsOf(dashA.body.clientsWithoutActiveTrainingPlan.items)).toEqual([
        clientNoTraining.id,
      ]);
      expect(idsOf(dashA.body.clientsWithoutActiveNutritionPlan.items)).toEqual(
        [clientNoNutrition.id],
      );
      expect(
        dashA.body.recentCompletedSessions.some(
          (row: { clientProfileId: string }) =>
            row.clientProfileId === clientPending.id,
        ),
      ).toBe(true);

      const dashBBefore = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authB)
        .expect(200);
      expect(dashBBefore.body.activeClientCount).toBe(0);
      expect(dashBBefore.body.pendingCheckIns.count).toBe(0);

      await assign(admin.authorization, clientPending.id, trainerB.id);

      const dashAAfter = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(dashAAfter.body.activeClientCount).toBe(3);
      expect(dashAAfter.body.pendingCheckIns.count).toBe(0);
      expect(
        dashAAfter.body.recentCompletedSessions.some(
          (row: { clientProfileId: string }) =>
            row.clientProfileId === clientPending.id,
        ),
      ).toBe(false);

      const dashBAfter = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authB)
        .expect(200);
      expect(dashBAfter.body.activeClientCount).toBe(1);
      expect(dashBAfter.body.pendingCheckIns.count).toBe(1);
      expect(dashBAfter.body.pendingCheckIns.items[0].clientProfileId).toBe(
        clientPending.id,
      );

      await request(http)
        .post(
          `/api/v1/clients/${clientPending.id}/check-ins/${pendingCheckInId}/review`,
        )
        .set('Authorization', authB)
        .send({ feedback: 'Reviewed after move' })
        .expect(201);
      const dashBReviewed = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authB)
        .expect(200);
      expect(dashBReviewed.body.pendingCheckIns.count).toBe(0);

      const missingPlan = await createActivatableTrainingPlan(
        authA,
        clientNoTraining.id,
        'Late Plan',
      );
      let missingDash = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(
        idsOf(missingDash.body.clientsWithoutActiveTrainingPlan.items),
      ).toEqual([clientNoTraining.id]);
      await activateTrainingPlan(
        authA,
        clientNoTraining.id,
        missingPlan.planId,
      );
      missingDash = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(missingDash.body.clientsWithoutActiveTrainingPlan.count).toBe(0);
      await archiveTrainingPlan(authA, clientNoTraining.id, missingPlan.planId);
      missingDash = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(
        idsOf(missingDash.body.clientsWithoutActiveTrainingPlan.items),
      ).toEqual([clientNoTraining.id]);

      const extraNutrition = await createActivatableNutritionPlan(
        authA,
        clientNoNutrition.id,
        'Late Food',
      );
      await activateNutritionPlan(authA, clientNoNutrition.id, extraNutrition);
      missingDash = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(missingDash.body.clientsWithoutActiveNutritionPlan.count).toBe(0);
      await archiveNutritionPlan(authA, clientNoNutrition.id, extraNutrition);
      missingDash = await request(http)
        .get('/api/v1/trainers/me/dashboard')
        .set('Authorization', authA)
        .expect(200);
      expect(
        idsOf(missingDash.body.clientsWithoutActiveNutritionPlan.items),
      ).toEqual([clientNoNutrition.id]);
    });
  });

  describe('trainer client overview', () => {
    it('paginates, searches with escaped wildcards, and never lists unassigned clients', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const assigned = await provisionClient(admin.authorization, {
        email: 'fit@example.com',
        firstName: 'Fay',
        lastName: 'Fit_100%',
      });
      const other = await provisionClient(admin.authorization, {
        email: 'other@example.com',
        firstName: 'Omar',
        lastName: 'Other',
      });
      const unassigned = await provisionClient(admin.authorization, {
        email: 'free@example.com',
        firstName: 'Una',
        lastName: 'Assigned',
      });
      await assign(admin.authorization, assigned.id, trainer.id);
      await assign(admin.authorization, other.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);

      const listed = await request(http)
        .get('/api/v1/trainers/me/reports/clients?page=1&limit=1')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(listed.body.data).toHaveLength(1);
      expect(listed.body.meta).toEqual({
        page: 1,
        limit: 1,
        totalItems: 2,
        totalPages: 2,
      });
      expect(listed.body.data[0]).not.toHaveProperty('bodyWeightKg');
      expect(listed.body.data[0]).not.toHaveProperty('email');

      const search = await request(http)
        .get(
          `/api/v1/trainers/me/reports/clients?search=${encodeURIComponent('Fit_100%')}`,
        )
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].clientProfileId).toBe(assigned.id);

      const wildcard = await request(http)
        .get('/api/v1/trainers/me/reports/clients?search=%')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(
        wildcard.body.data.every((row: { lastName: string }) =>
          row.lastName.includes('%'),
        ),
      ).toBe(true);
      expect(
        wildcard.body.data.some(
          (row: { clientProfileId: string }) =>
            row.clientProfileId === unassigned.id,
        ),
      ).toBe(false);

      const names = JSON.stringify(listed.body);
      expect(names).not.toContain(unassigned.id);
    });
  });

  describe('admin dashboard', () => {
    it('returns exact operational counts without sensitive details', async () => {
      const admin = await createAdmin();
      const trainerActive = await provisionTrainer(admin.authorization);
      const trainerDisabled = await provisionTrainer(admin.authorization, {
        email: 'disabled-trainer@example.com',
        firstName: 'Dot',
      });
      await request(http)
        .patch(`/api/v1/trainers/${trainerDisabled.id}/status`)
        .set('Authorization', admin.authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      const assigned = await provisionClient(admin.authorization, {
        email: 'assigned@example.com',
        firstName: 'Ann',
      });
      const unassigned = await provisionClient(admin.authorization, {
        email: 'unassigned@example.com',
        firstName: 'Uma',
      });
      const disabledClient = await provisionClient(admin.authorization, {
        email: 'disabled-client@example.com',
        firstName: 'Dan',
      });
      await assign(admin.authorization, assigned.id, trainerActive.id);
      await request(http)
        .patch(`/api/v1/clients/${disabledClient.id}/status`)
        .set('Authorization', admin.authorization)
        .send({ status: UserStatus.DISABLED })
        .expect(200);

      const trainerAuth = await authHeader(trainerActive.user.email);
      const assignedAuth = await authHeader(assigned.user.email);
      const training = await createActivatableTrainingPlan(
        trainerAuth,
        assigned.id,
        'Admin Plan',
      );
      await activateTrainingPlan(trainerAuth, assigned.id, training.planId);
      const nutritionId = await createActivatableNutritionPlan(
        trainerAuth,
        assigned.id,
        'Admin Food',
      );
      await activateNutritionPlan(trainerAuth, assigned.id, nutritionId);

      const inside = await completeSession(
        assignedAuth,
        training.planWorkoutId,
      );
      await backdateSession(
        inside.sessionId,
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );
      const outside = await completeSession(
        assignedAuth,
        training.planWorkoutId,
      );
      await backdateSession(
        outside.sessionId,
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      );

      const checkIn = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', assignedAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
        })
        .expect(201);
      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${readId(checkIn.body)}/status`)
        .set('Authorization', assignedAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      await seedNotification({
        recipientUserId: admin.user.id,
        actorUserId: assigned.user.id,
        clientProfileId: assigned.id,
      });

      const dash = await request(http)
        .get('/api/v1/admin/dashboard?periodDays=30')
        .set('Authorization', admin.authorization)
        .expect(200);

      expect(dash.body.activeTrainers).toBe(1);
      expect(dash.body.activeClients).toBe(2);
      expect(dash.body.currentlyAssignedClients).toBe(1);
      expect(dash.body.unassignedActiveClients).toBe(1);
      expect(dash.body.activeTrainingPlans).toBe(1);
      expect(dash.body.activeNutritionPlans).toBe(1);
      expect(dash.body.completedWorkoutSessions).toBe(1);
      expect(dash.body.pendingCheckIns).toBe(1);
      expect(dash.body.notifications.unreadCount).toBe(1);
      expect(JSON.stringify(dash.body)).not.toContain('bodyWeightKg');
      expect(JSON.stringify(dash.body)).not.toContain('energyLevel');
      expect(unassigned.id).toBeTruthy();
    });
  });
});
