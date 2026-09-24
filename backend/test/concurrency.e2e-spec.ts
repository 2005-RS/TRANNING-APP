import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { CheckInReview } from '../src/modules/check-ins/entities/check-in-review.entity';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { NutritionPlan } from '../src/modules/nutrition-plans/entities/nutrition-plan.entity';
import { NutritionMealType } from '../src/modules/nutrition-plans/enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../src/modules/nutrition-plans/enums/nutrition-plan-status.enum';
import { TrainingPlan } from '../src/modules/training-plans/entities/training-plan.entity';
import { TrainingPlanDayOfWeek } from '../src/modules/training-plans/enums/training-plan-day-of-week.enum';
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

describe('Concurrency safeguards (e2e)', () => {
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

  async function bootstrapActors() {
    const adminUser = await createUser({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    const adminAuth = await authHeader(adminUser.email);
    const trainerRes = await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', adminAuth)
      .send({
        email: 'trainer@example.com',
        password: PASSWORD,
        firstName: 'Tia',
        lastName: 'Trainer',
      })
      .expect(201);
    const clientRes = await request(http)
      .post('/api/v1/clients')
      .set('Authorization', adminAuth)
      .send({
        email: 'client@example.com',
        password: PASSWORD,
        firstName: 'Cara',
        lastName: 'Client',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.BEGINNER,
      })
      .expect(201);
    await request(http)
      .put(`/api/v1/clients/${clientRes.body.id as string}/trainer`)
      .set('Authorization', adminAuth)
      .send({ trainerId: trainerRes.body.id as string })
      .expect(200);
    return {
      trainerAuth: await authHeader(trainerRes.body.user.email as string),
      clientAuth: await authHeader(clientRes.body.user.email as string),
      clientId: clientRes.body.id as string,
    };
  }

  async function createActivatableTrainingPlan(
    trainerAuth: string,
    clientId: string,
    name: string,
  ): Promise<{ planId: string; planWorkoutId: string }> {
    const exercise = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', trainerAuth)
      .send({
        name: `${name} Bench`,
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      })
      .expect(201);
    const template = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', trainerAuth)
      .send({ name: `${name} Template` })
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
      .set('Authorization', trainerAuth)
      .send({ status: WorkoutTemplateStatus.ACTIVE })
      .expect(200);
    const plan = await request(http)
      .post(`/api/v1/clients/${clientId}/training-plans`)
      .set('Authorization', trainerAuth)
      .send({ name })
      .expect(201);
    const planId = readId(plan.body);
    await request(http)
      .put(`/api/v1/clients/${clientId}/training-plans/${planId}/workouts`)
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
    const detail = await request(http)
      .get(`/api/v1/clients/${clientId}/training-plans/${planId}`)
      .set('Authorization', trainerAuth)
      .expect(200);
    return { planId, planWorkoutId: detail.body.workouts[0].id as string };
  }

  it('allows only one IN_PROGRESS WorkoutSession under parallel starts', async () => {
    const { trainerAuth, clientAuth, clientId } = await bootstrapActors();
    const { planId, planWorkoutId } = await createActivatableTrainingPlan(
      trainerAuth,
      clientId,
      'Session Race',
    );
    await request(http)
      .patch(`/api/v1/clients/${clientId}/training-plans/${planId}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);

    const results = await Promise.allSettled([
      request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId }),
      request(http)
        .post('/api/v1/clients/me/workout-sessions')
        .set('Authorization', clientAuth)
        .send({ trainingPlanWorkoutId: planWorkoutId }),
    ]);
    const statuses = results
      .filter(
        (result): result is PromiseFulfilledResult<request.Response> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value.status);
    expect(statuses.sort()).toEqual([201, 409]);
    expect(
      await dataSource.getRepository(WorkoutSession).countBy({
        clientProfileId: clientId,
        status: WorkoutSessionStatus.IN_PROGRESS,
      }),
    ).toBe(1);
  });

  it('keeps one ACTIVE TrainingPlan after parallel activations', async () => {
    const { trainerAuth, clientId } = await bootstrapActors();
    const planA = await createActivatableTrainingPlan(
      trainerAuth,
      clientId,
      'Plan A',
    );
    const planB = await createActivatableTrainingPlan(
      trainerAuth,
      clientId,
      'Plan B',
    );

    const results = await Promise.allSettled([
      request(http)
        .patch(
          `/api/v1/clients/${clientId}/training-plans/${planA.planId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE }),
      request(http)
        .patch(
          `/api/v1/clients/${clientId}/training-plans/${planB.planId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: TrainingPlanStatus.ACTIVE }),
    ]);
    const statuses = results
      .filter(
        (result): result is PromiseFulfilledResult<request.Response> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value.status);
    expect(statuses.every((status) => status === 200 || status === 409)).toBe(
      true,
    );
    expect(
      await dataSource.getRepository(TrainingPlan).countBy({
        clientProfileId: clientId,
        status: TrainingPlanStatus.ACTIVE,
      }),
    ).toBe(1);
  });

  it('keeps one ACTIVE NutritionPlan after parallel activations', async () => {
    const { trainerAuth, clientId } = await bootstrapActors();
    const food = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAuth)
      .send({
        name: 'Chicken',
        caloriesPer100g: 165,
        proteinGPer100g: 31,
        carbohydratesGPer100g: 0,
        fatGPer100g: 3.6,
      })
      .expect(201);
    const foodId = readId(food.body);

    async function createPlan(name: string): Promise<string> {
      const created = await request(http)
        .post(`/api/v1/clients/${clientId}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name })
        .expect(201);
      const planId = readId(created.body);
      await request(http)
        .put(`/api/v1/clients/${clientId}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            {
              name: 'Lunch',
              mealType: NutritionMealType.LUNCH,
              items: [{ foodId, quantityGrams: 150 }],
            },
          ],
        })
        .expect(200);
      return planId;
    }

    const planA = await createPlan('Nutrition A');
    const planB = await createPlan('Nutrition B');
    const results = await Promise.allSettled([
      request(http)
        .patch(`/api/v1/clients/${clientId}/nutrition-plans/${planA}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE }),
      request(http)
        .patch(`/api/v1/clients/${clientId}/nutrition-plans/${planB}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE }),
    ]);
    const statuses = results
      .filter(
        (result): result is PromiseFulfilledResult<request.Response> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value.status);
    expect(statuses.every((status) => status === 200 || status === 409)).toBe(
      true,
    );
    expect(
      await dataSource.getRepository(NutritionPlan).countBy({
        clientProfileId: clientId,
        status: NutritionPlanStatus.ACTIVE,
      }),
    ).toBe(1);
  });

  it('allows only one CheckIn review under parallel creates', async () => {
    const { trainerAuth, clientAuth, clientId } = await bootstrapActors();
    const created = await request(http)
      .post('/api/v1/clients/me/check-ins')
      .set('Authorization', clientAuth)
      .send({
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
        stressLevel: 2,
      })
      .expect(201);
    const checkInId = readId(created.body);
    await request(http)
      .patch(`/api/v1/clients/me/check-ins/${checkInId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: 'SUBMITTED' })
      .expect(200);

    const results = await Promise.allSettled([
      request(http)
        .post(`/api/v1/clients/${clientId}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({ feedback: 'Keep going.' }),
      request(http)
        .post(`/api/v1/clients/${clientId}/check-ins/${checkInId}/review`)
        .set('Authorization', trainerAuth)
        .send({ feedback: 'Also keep going.' }),
    ]);
    const statuses = results
      .filter(
        (result): result is PromiseFulfilledResult<request.Response> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value.status);
    expect(statuses.sort()).toEqual([201, 409]);
    expect(
      await dataSource.getRepository(CheckInReview).countBy({ checkInId }),
    ).toBe(1);
  });
});
