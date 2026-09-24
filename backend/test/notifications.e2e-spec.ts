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
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from '../src/database/postgres-errors';
import { ActivityEvent } from '../src/modules/activity-events/entities/activity-event.entity';
import { ActivityEventEntityType } from '../src/modules/activity-events/enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../src/modules/activity-events/enums/activity-event-type.enum';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { CheckIn } from '../src/modules/check-ins/entities/check-in.entity';
import { CheckInStatus } from '../src/modules/check-ins/enums/check-in-status.enum';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { NotificationPublisherService } from '../src/modules/notifications/notification-publisher.service';
import { NutritionMealType } from '../src/modules/nutrition-plans/enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../src/modules/nutrition-plans/enums/nutrition-plan-status.enum';
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

describe('Notifications (e2e)', () => {
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

  async function seedNotification(input: {
    recipientUserId: string;
    actorUserId: string;
    clientProfileId: string;
    type?: ActivityEventType;
    readAt?: Date | null;
  }): Promise<{ event: ActivityEvent; notification: Notification }> {
    const events = dataSource.getRepository(ActivityEvent);
    const notifications = dataSource.getRepository(Notification);
    const event = await events.save(
      events.create({
        type: input.type ?? ActivityEventType.CHECK_IN_SUBMITTED,
        actorUserId: input.actorUserId,
        clientProfileId: input.clientProfileId,
        relatedEntityType: ActivityEventEntityType.CHECK_IN,
        relatedEntityId: randomUUID(),
      }),
    );
    const notification = await notifications.save(
      notifications.create({
        activityEventId: event.id,
        recipientUserId: input.recipientUserId,
        readAt: input.readAt ?? null,
      }),
    );
    return { event, notification };
  }

  function assertSafeNotification(body: unknown): void {
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('wins');
    expect(serialized).not.toContain('challenges');
    expect(serialized).not.toContain('generalNotes');
    expect(serialized).not.toContain('feedback');
    expect(serialized).not.toContain('actionItems');
    expect(serialized).not.toContain('targetCalories');
    expect(serialized).not.toContain('storageKey');
    expect(serialized).not.toContain('signedUrl');
  }

  describe('inbox', () => {
    it('paginates, filters, counts, marks read idempotently, and isolates read-all', async () => {
      const admin = await createAdmin();
      const trainerA = await provisionTrainer(admin.authorization);
      const trainerB = await provisionTrainer(admin.authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(admin.authorization);
      const authA = await authHeader(trainerA.user.email);
      const authB = await authHeader(trainerB.user.email);

      const unreadA = [];
      for (let i = 0; i < 3; i += 1) {
        unreadA.push(
          await seedNotification({
            recipientUserId: trainerA.user.id,
            actorUserId: client.user.id,
            clientProfileId: client.id,
          }),
        );
      }
      for (let i = 0; i < 2; i += 1) {
        await seedNotification({
          recipientUserId: trainerA.user.id,
          actorUserId: client.user.id,
          clientProfileId: client.id,
          readAt: new Date('2026-09-01T00:00:00.000Z'),
        });
      }
      await seedNotification({
        recipientUserId: trainerB.user.id,
        actorUserId: client.user.id,
        clientProfileId: client.id,
      });
      await seedNotification({
        recipientUserId: trainerB.user.id,
        actorUserId: client.user.id,
        clientProfileId: client.id,
      });

      await request(http).get('/api/v1/notifications').expect(401);

      const listed = await request(http)
        .get('/api/v1/notifications?limit=2&page=1')
        .set('Authorization', authA)
        .expect(200);
      expect(listed.body.data).toHaveLength(2);
      expect(listed.body.meta).toEqual({
        page: 1,
        limit: 2,
        totalItems: 5,
        totalPages: 3,
      });
      expect(listed.body.data[0]).not.toHaveProperty('recipientUserId');
      expect(listed.body.data[0]).not.toHaveProperty('actorUserId');
      assertSafeNotification(listed.body);

      const unread = await request(http)
        .get('/api/v1/notifications?readState=UNREAD')
        .set('Authorization', authA)
        .expect(200);
      expect(unread.body.data).toHaveLength(3);

      const count = await request(http)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', authA)
        .expect(200);
      expect(count.body).toEqual({ unreadCount: 3 });

      const marked = await request(http)
        .patch(`/api/v1/notifications/${unreadA[0].notification.id}/read`)
        .set('Authorization', authA)
        .expect(200);
      const readAt = marked.body.readAt as string;
      expect(readAt).toBeTruthy();

      const repeated = await request(http)
        .patch(`/api/v1/notifications/${unreadA[0].notification.id}/read`)
        .set('Authorization', authA)
        .expect(200);
      expect(repeated.body.readAt).toBe(readAt);

      const afterOne = await request(http)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', authA)
        .expect(200);
      expect(afterOne.body).toEqual({ unreadCount: 2 });

      const eventBefore = await dataSource
        .getRepository(ActivityEvent)
        .findOneByOrFail({
          id: unreadA[0].event.id,
        });

      await request(http)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', authA)
        .expect(200)
        .expect((res) => {
          expect(res.body.updatedCount).toBe(2);
        });

      const afterAll = await request(http)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', authA)
        .expect(200);
      expect(afterAll.body).toEqual({ unreadCount: 0 });

      const bCount = await request(http)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', authB)
        .expect(200);
      expect(bCount.body).toEqual({ unreadCount: 2 });

      await request(http)
        .patch(`/api/v1/notifications/${unreadA[1].notification.id}/read`)
        .set('Authorization', authB)
        .expect(404);

      const eventAfter = await dataSource
        .getRepository(ActivityEvent)
        .findOneByOrFail({
          id: unreadA[0].event.id,
        });
      expect(eventAfter.type).toBe(eventBefore.type);
      expect(eventAfter.actorUserId).toBe(eventBefore.actorUserId);
      expect(eventAfter.relatedEntityId).toBe(eventBefore.relatedEntityId);
      expect(eventAfter.createdAt.toISOString()).toBe(
        eventBefore.createdAt.toISOString(),
      );
    });

    it('keeps static unread-count and read-all off the :notificationId route', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const auth = await authHeader(trainer.user.email);

      await request(http)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', auth)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ unreadCount: 0 });
        });

      await request(http)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', auth)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ updatedCount: 0 });
        });

      await request(http)
        .patch('/api/v1/notifications/unread-count/read')
        .set('Authorization', auth)
        .expect(400);
    });
  });

  describe('check-in integrations', () => {
    it('notifies the current trainer on submit, not the client, without sensitive body', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const created = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
          wins: 'Secret win text',
        })
        .expect(201);
      const checkInId = readId(created.body);

      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const trainerInbox = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(trainerInbox.body.data).toHaveLength(1);
      expect(trainerInbox.body.data[0].type).toBe(
        ActivityEventType.CHECK_IN_SUBMITTED,
      );
      expect(trainerInbox.body.data[0].relatedEntity).toEqual({
        type: ActivityEventEntityType.CHECK_IN,
        id: checkInId,
      });
      expect(trainerInbox.body.data[0].clientProfileId).toBe(client.id);
      assertSafeNotification(trainerInbox.body);
      expect(JSON.stringify(trainerInbox.body)).not.toContain(
        'Secret win text',
      );

      const clientInbox = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(clientInbox.body.data).toHaveLength(0);

      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const stillOne = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(stillOne.body.data).toHaveLength(1);
    });

    it('resolves the trainer recipient at submission time after reassignment', async () => {
      const admin = await createAdmin();
      const trainerA = await provisionTrainer(admin.authorization);
      const trainerB = await provisionTrainer(admin.authorization, {
        email: 'trainer-b@example.com',
        firstName: 'Bea',
      });
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainerA.id);
      const clientAuth = await authHeader(client.user.email);
      const authA = await authHeader(trainerA.user.email);
      const authB = await authHeader(trainerB.user.email);

      const created = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
        })
        .expect(201);

      await assign(admin.authorization, client.id, trainerB.id);

      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${readId(created.body)}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const inboxA = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', authA)
        .expect(200);
      expect(inboxA.body.data).toHaveLength(0);

      const inboxB = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', authB)
        .expect(200);
      expect(inboxB.body.data).toHaveLength(1);
      expect(inboxB.body.data[0].type).toBe(
        ActivityEventType.CHECK_IN_SUBMITTED,
      );
    });

    it('allows unassigned submit to persist an event without a notification', async () => {
      const admin = await createAdmin();
      const client = await provisionClient(admin.authorization);
      const clientAuth = await authHeader(client.user.email);

      const created = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 3,
        })
        .expect(201);
      const checkInId = readId(created.body);

      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const events = await dataSource.getRepository(ActivityEvent).find();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(ActivityEventType.CHECK_IN_SUBMITTED);
      expect(events[0].relatedEntityId).toBe(checkInId);

      const notifications = await dataSource.getRepository(Notification).find();
      expect(notifications).toHaveLength(0);
    });

    it('notifies the Client once on first review and not again on review PATCH', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const created = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
        })
        .expect(201);
      const checkInId = readId(created.body);
      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      await request(http)
        .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({
          feedback: 'Private trainer feedback.',
          actionItems: 'Do not copy',
        })
        .expect(201);

      const clientInbox = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(clientInbox.body.data).toHaveLength(1);
      expect(clientInbox.body.data[0].type).toBe(
        ActivityEventType.CHECK_IN_REVIEWED,
      );
      expect(JSON.stringify(clientInbox.body)).not.toContain(
        'Private trainer feedback',
      );

      const trainerInbox = await request(http)
        .get('/api/v1/notifications?type=CHECK_IN_REVIEWED')
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(trainerInbox.body.data).toHaveLength(0);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({ feedback: 'Edited feedback.' })
        .expect(200);

      const stillOne = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(stillOne.body.data).toHaveLength(1);
    });
  });

  describe('plan activations', () => {
    async function createActivatableTrainingPlan(
      authorization: string,
      clientId: string,
      name: string,
    ): Promise<string> {
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
      const exerciseId = readId(exercise.body);
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
              exerciseId,
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
      return planId;
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

    it('notifies the Client on training plan activation, not on repeat, and again on reactivation', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const planId = await createActivatableTrainingPlan(
        trainerAuth,
        client.id,
        'Phase 1',
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const first = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(first.body.data).toHaveLength(1);
      expect(first.body.data[0].type).toBe(
        ActivityEventType.TRAINING_PLAN_ACTIVATED,
      );
      expect(first.body.data[0].relatedEntity.id).toBe(planId);
      assertSafeNotification(first.body);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);
      const stillOne = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(stillOne.body.data).toHaveLength(1);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const reactivated = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(reactivated.body.data).toHaveLength(2);
      expect(
        reactivated.body.data.every(
          (item: { type: string }) =>
            item.type === ActivityEventType.TRAINING_PLAN_ACTIVATED,
        ),
      ).toBe(true);
    });

    it('emits one activation event for the replacement plan, not for the auto-archived plan', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const planA = await createActivatableTrainingPlan(
        trainerAuth,
        client.id,
        'Plan A',
      );
      const planB = await createActivatableTrainingPlan(
        trainerAuth,
        client.id,
        'Plan B',
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planA}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planB}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const inbox = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(inbox.body.data).toHaveLength(2);
      const ids = inbox.body.data.map(
        (item: { relatedEntity: { id: string } }) => item.relatedEntity.id,
      );
      expect(ids).toEqual(expect.arrayContaining([planA, planB]));
    });

    it('records ADMIN as actor when ADMIN activates a training plan', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const planId = await createActivatableTrainingPlan(
        trainerAuth,
        client.id,
        'Admin Activate',
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planId}/status`)
        .set('Authorization', admin.authorization)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const events = await dataSource.getRepository(ActivityEvent).find({
        where: { relatedEntityId: planId },
      });
      expect(events).toHaveLength(1);
      expect(events[0].actorUserId).toBe(admin.user.id);
      expect(events[0].type).toBe(ActivityEventType.TRAINING_PLAN_ACTIVATED);
    });

    it('notifies the Client on nutrition plan activation, not on repeat, and again on reactivation', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);
      const planId = await createActivatableNutritionPlan(
        trainerAuth,
        client.id,
        'Cut',
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      const first = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(first.body.data).toHaveLength(1);
      expect(first.body.data[0].type).toBe(
        ActivityEventType.NUTRITION_PLAN_ACTIVATED,
      );
      expect(JSON.stringify(first.body)).not.toContain('2200');

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);
      expect(
        (
          await request(http)
            .get('/api/v1/notifications')
            .set('Authorization', clientAuth)
            .expect(200)
        ).body.data,
      ).toHaveLength(1);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      const reactivated = await request(http)
        .get('/api/v1/notifications')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(reactivated.body.data).toHaveLength(2);
    });
  });

  describe('transaction rollback', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('keeps CheckIn SUBMITTED when review notification publishing fails', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const created = await request(http)
        .post('/api/v1/clients/me/check-ins')
        .set('Authorization', clientAuth)
        .send({
          periodStart: '2026-08-24',
          periodEnd: '2026-08-30',
          energyLevel: 4,
        })
        .expect(201);
      const checkInId = readId(created.body);
      await request(http)
        .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
        .set('Authorization', clientAuth)
        .send({ status: 'SUBMITTED' })
        .expect(200);

      const publisher = app.get(NotificationPublisherService);
      const original = publisher.publish.bind(publisher);
      jest
        .spyOn(publisher, 'publish')
        .mockImplementation(async (manager, command) => {
          if (command.type === ActivityEventType.CHECK_IN_REVIEWED) {
            throw new Error('forced publisher failure');
          }
          return original(manager, command);
        });

      await request(http)
        .post(`/api/v1/clients/${client.id}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({ feedback: 'Should roll back.' })
        .expect(500);

      const checkIn = await dataSource.getRepository(CheckIn).findOneByOrFail({
        id: checkInId,
      });
      expect(checkIn.status).toBe(CheckInStatus.SUBMITTED);
      expect(
        await dataSource.getRepository(ActivityEvent).count({
          where: { type: ActivityEventType.CHECK_IN_REVIEWED },
        }),
      ).toBe(0);
      expect(
        await dataSource.getRepository(Notification).count({
          where: { recipientUserId: client.user.id },
        }),
      ).toBe(0);
    });

    it('does not activate a training plan when publishing fails', async () => {
      const admin = await createAdmin();
      const trainer = await provisionTrainer(admin.authorization);
      const client = await provisionClient(admin.authorization);
      await assign(admin.authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const exercise = await request(http)
        .post('/api/v1/exercises')
        .set('Authorization', trainerAuth)
        .send({
          name: 'Rollback Squat',
          primaryMuscleGroup: ExerciseMuscleGroup.QUADRICEPS,
          equipmentType: ExerciseEquipmentType.BARBELL,
          difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
        })
        .expect(201);
      const template = await request(http)
        .post('/api/v1/workout-templates')
        .set('Authorization', trainerAuth)
        .send({ name: 'Rollback Template' })
        .expect(201);
      const templateId = readId(template.body);
      await request(http)
        .put(`/api/v1/workout-templates/${templateId}/exercises`)
        .set('Authorization', trainerAuth)
        .send({
          items: [
            {
              exerciseId: readId(exercise.body),
              sets: 3,
              prescriptionType: WorkoutPrescriptionType.REPS,
              repsMin: 5,
              repsMax: 5,
              restSeconds: 120,
              targetRir: 2,
            },
          ],
        })
        .expect(200);
      await request(http)
        .patch(`/api/v1/workout-templates/${templateId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: WorkoutTemplateStatus.ACTIVE })
        .expect(200);
      const planA = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Keep Active' })
        .expect(201);
      const planAId = readId(planA.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planAId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({
          workouts: [
            {
              workoutTemplateId: templateId,
              scheduledDay: TrainingPlanDayOfWeek.MONDAY,
            },
          ],
        })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planAId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(200);

      const planB = await request(http)
        .post(`/api/v1/clients/${client.id}/training-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Should Stay Draft' })
        .expect(201);
      const planBId = readId(planB.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/training-plans/${planBId}/workouts`)
        .set('Authorization', trainerAuth)
        .send({
          workouts: [
            {
              workoutTemplateId: templateId,
              scheduledDay: TrainingPlanDayOfWeek.WEDNESDAY,
            },
          ],
        })
        .expect(200);

      const publisher = app.get(NotificationPublisherService);
      const original = publisher.publish.bind(publisher);
      jest
        .spyOn(publisher, 'publish')
        .mockImplementation(async (manager, command) => {
          if (command.type === ActivityEventType.TRAINING_PLAN_ACTIVATED) {
            throw new Error('forced publisher failure');
          }
          return original(manager, command);
        });

      await request(http)
        .patch(`/api/v1/clients/${client.id}/training-plans/${planBId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE })
        .expect(500);

      const kept = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planAId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(kept.body.status).toBe(TrainingPlanStatus.ACTIVE);
      const draft = await request(http)
        .get(`/api/v1/clients/${client.id}/training-plans/${planBId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(draft.body.status).toBe(TrainingPlanStatus.DRAFT);
      expect(
        await dataSource.getRepository(ActivityEvent).count({
          where: { relatedEntityId: planBId },
        }),
      ).toBe(0);
    });
  });

  describe('postgresql integrity', () => {
    it('rejects invalid actor, recipient, event FKs and duplicate event-recipient pairs', async () => {
      const admin = await createAdmin();
      const client = await provisionClient(admin.authorization);
      const events = dataSource.getRepository(ActivityEvent);
      const notifications = dataSource.getRepository(Notification);

      try {
        await events.save(
          events.create({
            type: ActivityEventType.CHECK_IN_SUBMITTED,
            actorUserId: randomUUID(),
            clientProfileId: client.id,
            relatedEntityType: ActivityEventEntityType.CHECK_IN,
            relatedEntityId: randomUUID(),
          }),
        );
        throw new Error('expected invalid actor FK');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      const event = await events.save(
        events.create({
          type: ActivityEventType.CHECK_IN_SUBMITTED,
          actorUserId: admin.user.id,
          clientProfileId: client.id,
          relatedEntityType: ActivityEventEntityType.CHECK_IN,
          relatedEntityId: randomUUID(),
        }),
      );

      const saved = await notifications.save(
        notifications.create({
          activityEventId: event.id,
          recipientUserId: admin.user.id,
          readAt: null,
        }),
      );
      expect(saved.readAt).toBeNull();

      try {
        await notifications.save(
          notifications.create({
            activityEventId: event.id,
            recipientUserId: admin.user.id,
            readAt: null,
          }),
        );
        throw new Error('expected unique event-recipient');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      try {
        await notifications.save(
          notifications.create({
            activityEventId: randomUUID(),
            recipientUserId: admin.user.id,
            readAt: null,
          }),
        );
        throw new Error('expected invalid activity event FK');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await notifications.save(
          notifications.create({
            activityEventId: event.id,
            recipientUserId: randomUUID(),
            readAt: null,
          }),
        );
        throw new Error('expected invalid recipient FK');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }
    });
  });
});
