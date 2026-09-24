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
const FOREIGN_UUID = '11111111-1111-4111-8111-111111111111';

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

describe('Security matrix (e2e)', () => {
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

  async function login(email: string) {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return {
      authorization: `Bearer ${response.body.accessToken as string}`,
      cookie: readCookie(response, COOKIE),
    };
  }

  async function provisionTrainer(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', authorization)
      .send({
        email: 'trainer-a@example.com',
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
        email: 'client-a@example.com',
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

  it('enforces role, relationship, IDOR, mass-assignment, UUID, and disabled-user rules', async () => {
    const adminUser = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    const admin = await login(adminUser.email);
    const trainerA = await provisionTrainer(admin.authorization);
    const trainerB = await provisionTrainer(admin.authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const clientA = await provisionClient(admin.authorization);
    const clientB = await provisionClient(admin.authorization, {
      email: 'client-b@example.com',
      firstName: 'Cody',
    });
    await request(http)
      .put(`/api/v1/clients/${clientA.id}/trainer`)
      .set('Authorization', admin.authorization)
      .send({ trainerId: trainerA.id })
      .expect(200);
    await request(http)
      .put(`/api/v1/clients/${clientB.id}/trainer`)
      .set('Authorization', admin.authorization)
      .send({ trainerId: trainerB.id })
      .expect(200);

    const trainerAAuth = (await login(trainerA.user.email)).authorization;
    const trainerBAuth = (await login(trainerB.user.email)).authorization;
    const clientALogin = await login(clientA.user.email);
    const clientBAuth = (await login(clientB.user.email)).authorization;

    const measurementA = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientALogin.authorization)
      .send({ bodyWeightKg: 80.5 })
      .expect(201);
    const measurementAId = readId(measurementA.body);

    const measurementB = await request(http)
      .post('/api/v1/clients/me/body-measurements')
      .set('Authorization', clientBAuth)
      .send({ bodyWeightKg: 70.1 })
      .expect(201);
    const measurementBId = readId(measurementB.body);

    const exercise = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', trainerAAuth)
      .send({
        name: 'Security Bench',
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      })
      .expect(201);
    const template = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', trainerAAuth)
      .send({ name: 'Security Template' })
      .expect(201);
    const templateId = readId(template.body);
    await request(http)
      .put(`/api/v1/workout-templates/${templateId}/exercises`)
      .set('Authorization', trainerAAuth)
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
      .set('Authorization', trainerAAuth)
      .send({ status: WorkoutTemplateStatus.ACTIVE })
      .expect(200);

    const plan = await request(http)
      .post(`/api/v1/clients/${clientA.id}/training-plans`)
      .set('Authorization', trainerAAuth)
      .send({ name: 'Security Plan' })
      .expect(201);
    const planId = readId(plan.body);
    await request(http)
      .put(`/api/v1/clients/${clientA.id}/training-plans/${planId}/workouts`)
      .set('Authorization', trainerAAuth)
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
      .patch(`/api/v1/clients/${clientA.id}/training-plans/${planId}/status`)
      .set('Authorization', trainerAAuth)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);

    const food = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAAuth)
      .send({
        name: 'Chicken',
        caloriesPer100g: 165,
        proteinGPer100g: 31,
        carbohydratesGPer100g: 0,
        fatGPer100g: 3.6,
      })
      .expect(201);
    const nutritionPlan = await request(http)
      .post(`/api/v1/clients/${clientA.id}/nutrition-plans`)
      .set('Authorization', trainerAAuth)
      .send({ name: 'Security Nutrition' })
      .expect(201);
    const nutritionPlanId = readId(nutritionPlan.body);
    await request(http)
      .put(
        `/api/v1/clients/${clientA.id}/nutrition-plans/${nutritionPlanId}/meals`,
      )
      .set('Authorization', trainerAAuth)
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
    await request(http)
      .patch(
        `/api/v1/clients/${clientA.id}/nutrition-plans/${nutritionPlanId}/status`,
      )
      .set('Authorization', trainerAAuth)
      .send({ status: NutritionPlanStatus.ACTIVE })
      .expect(200);

    const checkIn = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientALogin.authorization)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        stressLevel: 2,
      })
      .expect(201);
    const checkInId = readId(checkIn.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientALogin.authorization)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    const inbox = await request(http)
      .get('/api/v1/notifications')
      .set('Authorization', clientALogin.authorization)
      .expect(200);
    const notificationId = inbox.body.data[0].id as string;

    const anonymousRoutes = [
      '/api/v1/clients',
      '/api/v1/trainers',
      `/api/v1/clients/${clientA.id}`,
      `/api/v1/clients/${clientA.id}/training-plans`,
      `/api/v1/clients/${clientA.id}/body-measurements/${measurementAId}`,
      '/api/v1/trainers/me/dashboard',
      '/api/v1/admin/dashboard',
      '/api/v1/notifications',
    ];
    for (const path of anonymousRoutes) {
      await request(http).get(path).expect(401);
    }

    await request(http)
      .get('/api/v1/clients')
      .set('Authorization', trainerAAuth)
      .expect(403);
    await request(http)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', trainerAAuth)
      .expect(403);
    await request(http)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', clientALogin.authorization)
      .expect(403);
    await request(http)
      .get('/api/v1/trainers/me/dashboard')
      .set('Authorization', clientALogin.authorization)
      .expect(403);
    await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', clientALogin.authorization)
      .send({
        email: 'nope@example.com',
        password: PASSWORD,
        firstName: 'Nope',
        lastName: 'Nope',
      })
      .expect(403);

    await request(http)
      .get(`/api/v1/clients/${clientA.id}/body-measurements/${measurementAId}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/training-plans/${planId}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/nutrition-plans/${nutritionPlanId}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/check-ins/${checkInId}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/workout-sessions`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/progress-photos`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/trainers/me/clients/${clientA.id}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientB.id}/body-measurements/${measurementBId}`)
      .set('Authorization', trainerAAuth)
      .expect(404);

    await request(http)
      .get(`/api/v1/clients/me/body-measurements/${measurementBId}`)
      .set('Authorization', clientALogin.authorization)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/body-measurements/${measurementAId}`)
      .set('Authorization', clientBAuth)
      .expect(403);
    await request(http)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', clientBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/clients/${clientA.id}/training-plans/${planId}`)
      .set('Authorization', clientBAuth)
      .expect(403);

    await request(http)
      .get(`/api/v1/clients/${clientA.id}/body-measurements/not-a-uuid`)
      .set('Authorization', trainerAAuth)
      .expect(400);
    await request(http)
      .get(`/api/v1/notifications/${FOREIGN_UUID}`)
      .set('Authorization', clientALogin.authorization)
      .expect(404);

    await request(http)
      .post('/api/v1/clients')
      .set('Authorization', admin.authorization)
      .send({
        email: 'mass@example.com',
        password: PASSWORD,
        firstName: 'Mass',
        lastName: 'Assign',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.BEGINNER,
        role: UserRole.ADMIN,
        status: UserStatus.DISABLED,
        passwordHash: 'stolen',
        trainerId: trainerA.id,
      })
      .expect(400);

    await request(http)
      .get('/api/v1/clients/me')
      .set('Authorization', clientALogin.authorization)
      .expect(200);
    await request(http)
      .get('/api/v1/clients/me/dashboard')
      .set('Authorization', clientALogin.authorization)
      .expect(200);
    await request(http)
      .get('/api/v1/trainers/me/dashboard')
      .set('Authorization', trainerAAuth)
      .expect(200);
    await request(http)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', clientALogin.authorization)
      .expect(200);
    await request(http)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', clientALogin.authorization)
      .expect(200);

    await request(http)
      .patch(`/api/v1/clients/${clientA.id}/status`)
      .set('Authorization', admin.authorization)
      .send({ status: UserStatus.DISABLED })
      .expect(200);

    await request(http)
      .get('/api/v1/clients/me')
      .set('Authorization', clientALogin.authorization)
      .expect(401);
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: clientA.user.email, password: PASSWORD })
      .expect(401);
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${clientALogin.cookie ?? ''}`)
      .expect(401);

    await request(http)
      .patch(`/api/v1/clients/${clientA.id}/status`)
      .set('Authorization', admin.authorization)
      .send({ status: UserStatus.ACTIVE })
      .expect(200);
    await request(http)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE}=${clientALogin.cookie ?? ''}`)
      .expect(401);
    await request(http)
      .post('/api/v1/auth/login')
      .send({ email: clientA.user.email, password: PASSWORD })
      .expect(200);
  });
});
