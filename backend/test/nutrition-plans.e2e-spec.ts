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
import { NutritionPlanMealItem } from '../src/modules/nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from '../src/modules/nutrition-plans/entities/nutrition-plan-meal.entity';
import { NutritionPlan } from '../src/modules/nutrition-plans/entities/nutrition-plan.entity';
import { NutritionMealType } from '../src/modules/nutrition-plans/enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../src/modules/nutrition-plans/enums/nutrition-plan-status.enum';
import { NutritionFoodStatus } from '../src/modules/nutrition-foods/enums/nutrition-food-status.enum';
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

describe('Nutrition plans (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let plans: Repository<NutritionPlan>;
  let planMeals: Repository<NutritionPlanMeal>;
  let planItems: Repository<NutritionPlanMealItem>;
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
    plans = dataSource.getRepository(NutritionPlan);
    planMeals = dataSource.getRepository(NutritionPlanMeal);
    planItems = dataSource.getRepository(NutritionPlanMealItem);
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

  async function createFood(
    authorization: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', authorization)
      .send({
        name: 'Chicken Breast',
        caloriesPer100g: 165,
        proteinGPer100g: 31,
        carbohydratesGPer100g: 0,
        fatGPer100g: 3.6,
        ...overrides,
      })
      .expect(201);
    return readId(response.body);
  }

  function meal(
    name: string,
    mealType: NutritionMealType,
    items: Array<{ foodId: string; quantityGrams: number; notes?: string }>,
  ) {
    return { name, mealType, items };
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
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', authorization)
        .send({ name: '  Hypertrophy   Nutrition  ', targetCaloriesKcal: 2700 })
        .expect(201);
      expect(adminCreated.body.status).toBe(NutritionPlanStatus.DRAFT);
      expect(adminCreated.body.meals).toEqual([]);
      expect(adminCreated.body.targets.caloriesKcal).toBe(2700);

      const trainerCreated = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAAuth)
        .send({ name: 'Trainer Plan' })
        .expect(201);
      expect(trainerCreated.body.createdByUserId).toBe(trainerA.user.id);

      await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Should 404' })
        .expect(404);

      await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', clientAuth)
        .send({ name: 'Client Plan' })
        .expect(403);

      await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .send({ name: 'Anon' })
        .expect(401);

      await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', authorization)
        .send({
          name: 'Hijack',
          clientProfileId: randomUUID(),
          trainerId: randomUUID(),
          createdByUserId: randomUUID(),
          status: NutritionPlanStatus.ACTIVE,
          activatedAt: new Date().toISOString(),
        })
        .expect(400);

      await request(http)
        .get('/api/v1/clients/me/nutrition-plans')
        .set('Authorization', authorization)
        .expect(403);
      await request(http)
        .get('/api/v1/clients/me/nutrition-plans')
        .set('Authorization', trainerAAuth)
        .expect(403);
    });
  });

  describe('snapshots, exact math, personalization and archive independence', () => {
    it('snapshots food values, keeps exact totals, and ignores later catalog edits', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const clientAuth = await authHeader(client.user.email);

      const oats = await createFood(trainerAuth, {
        name: 'Oats',
        caloriesPer100g: 389,
        proteinGPer100g: 16.9,
        carbohydratesGPer100g: 66.3,
        fatGPer100g: 6.9,
        fiberGPer100g: 10.6,
      });
      const exactA = await createFood(trainerAuth, {
        name: 'Exact A',
        caloriesPer100g: 200,
        proteinGPer100g: 20,
        carbohydratesGPer100g: 30,
        fatGPer100g: 5,
        fiberGPer100g: 10,
      });
      const exactB = await createFood(trainerAuth, {
        name: 'Exact B',
        caloriesPer100g: 500,
        proteinGPer100g: 40,
        carbohydratesGPer100g: 60,
        fatGPer100g: 12,
        fiberGPer100g: 0,
      });
      const rice = await createFood(trainerAuth, {
        name: 'Rice',
        caloriesPer100g: 130,
        proteinGPer100g: 2.7,
        carbohydratesGPer100g: 28,
        fatGPer100g: 0.3,
      });

      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({
          name: 'Hypertrophy Nutrition',
          startDate: '2026-09-01',
          targetCaloriesKcal: 2700,
          targetProteinG: 180,
          targetCarbohydratesG: 330,
          targetFatG: 70,
        })
        .expect(201);
      const planId = readId(plan.body);

      const snapshotted = await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Breakfast', NutritionMealType.BREAKFAST, [
              { foodId: oats, quantityGrams: 80 },
            ]),
          ],
        })
        .expect(200);

      const oatsItem = snapshotted.body.meals[0].items[0];
      expect(oatsItem.foodName).toBe('Oats');
      expect(oatsItem.quantityGrams).toBe(80);
      expect(oatsItem.nutrition).toEqual({
        caloriesKcal: 311.2,
        proteinG: 13.52,
        carbohydratesG: 53.04,
        fatG: 5.52,
        fiberG: 8.48,
      });

      await request(http)
        .patch(`/api/v1/nutrition/foods/${oats}`)
        .set('Authorization', trainerAuth)
        .send({
          name: 'Rolled Oats',
          caloriesPer100g: 1,
          proteinGPer100g: 1,
          carbohydratesGPer100g: 1,
          fatGPer100g: 1,
        })
        .expect(200);

      const afterRename = await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(afterRename.body.meals[0].items[0].foodName).toBe('Oats');
      expect(afterRename.body.meals[0].items[0].nutrition).toEqual({
        caloriesKcal: 311.2,
        proteinG: 13.52,
        carbohydratesG: 53.04,
        fatG: 5.52,
        fiberG: 8.48,
      });

      const totalsPlan = await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Meal A', NutritionMealType.BREAKFAST, [
              { foodId: exactA, quantityGrams: 150 },
            ]),
            meal('Meal B', NutritionMealType.LUNCH, [
              { foodId: exactB, quantityGrams: 100 },
            ]),
          ],
        })
        .expect(200);
      expect(totalsPlan.body.meals[0].items[0].nutrition).toEqual({
        caloriesKcal: 300,
        proteinG: 30,
        carbohydratesG: 45,
        fatG: 7.5,
        fiberG: 15,
      });
      expect(totalsPlan.body.meals[1].items[0].nutrition).toEqual({
        caloriesKcal: 500,
        proteinG: 40,
        carbohydratesG: 60,
        fatG: 12,
        fiberG: 0,
      });
      expect(totalsPlan.body.mealPlanTotals).toEqual({
        caloriesKcal: 800,
        proteinG: 70,
        carbohydratesG: 105,
        fatG: 19.5,
        fiberG: 15,
      });
      expect(totalsPlan.body.targets.caloriesKcal).toBe(2700);
      expect(totalsPlan.body.targetDifferences.caloriesDifferenceKcal).toBe(
        -1900,
      );

      const withRice = await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Meal A', NutritionMealType.BREAKFAST, [
              { foodId: exactA, quantityGrams: 150 },
            ]),
            meal('Meal B', NutritionMealType.LUNCH, [
              { foodId: rice, quantityGrams: 200 },
            ]),
          ],
        })
        .expect(200);
      const riceItem = withRice.body.meals[1].items[0];
      expect(riceItem.foodName).toBe('Rice');
      expect(riceItem.quantityGrams).toBe(200);
      const patched = await request(http)
        .patch(
          `/api/v1/clients/${client.id}/nutrition-plans/${planId}/items/${riceItem.id}`,
        )
        .set('Authorization', trainerAuth)
        .send({ quantityGrams: 250 })
        .expect(200);
      const patchedItem = patched.body.meals[1].items[0];
      expect(patchedItem.foodId).toBe(rice);
      expect(patchedItem.foodName).toBe('Rice');
      expect(patchedItem.quantityGrams).toBe(250);
      expect(patchedItem.nutrition.caloriesKcal).toBe(325);
      expect(patched.body.mealPlanTotals.caloriesKcal).toBe(625);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      await request(http)
        .patch(`/api/v1/nutrition/foods/${exactA}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionFoodStatus.ARCHIVED })
        .expect(200);

      const current = await request(http)
        .get('/api/v1/clients/me/nutrition-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(current.body.nutritionPlan.status).toBe(
        NutritionPlanStatus.ACTIVE,
      );
      expect(current.body.nutritionPlan.meals[0].items[0].nutrition).toEqual({
        caloriesKcal: 300,
        proteinG: 30,
        carbohydratesG: 45,
        fatG: 7.5,
        fiberG: 15,
      });

      const archivedFood = exactA;
      const mixed = await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Keep', NutritionMealType.DINNER, [
              { foodId: rice, quantityGrams: 100 },
              { foodId: archivedFood, quantityGrams: 50 },
            ]),
          ],
        })
        .expect(409);
      expect(mixed.body.statusCode).toBe(409);
      const afterRollback = await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planId}`)
        .set('Authorization', trainerAuth)
        .expect(200);
      expect(afterRollback.body.meals[0].name).toBe('Meal A');
      expect(afterRollback.body.meals).toHaveLength(2);
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

      const foodId = await createFood(trainerAAuth);

      const planA = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAAuth)
        .send({ name: 'Plan A' })
        .expect(201);
      const planAId = readId(planA.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}/meals`)
        .set('Authorization', trainerAAuth)
        .send({
          meals: [
            meal('Breakfast', NutritionMealType.BREAKFAST, [
              { foodId, quantityGrams: 100 },
            ]),
          ],
        })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}/status`)
        .set('Authorization', trainerAAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}`)
        .set('Authorization', trainerAAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .expect(404);

      await assign(authorization, client.id, trainerB.id);

      await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}`)
        .set('Authorization', trainerAAuth)
        .expect(404);
      const asB = await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .expect(200);
      expect(asB.body.createdByUserId).toBe(trainerA.user.id);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planAId}`)
        .set('Authorization', trainerBAuth)
        .send({ description: 'Now owned by relationship' })
        .expect(200);

      const planB = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Plan B' })
        .expect(201);
      const planBId = readId(planB.body);

      const clientDraftList = await request(http)
        .get('/api/v1/clients/me/nutrition-plans')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(
        clientDraftList.body.data.map((row: { id: string }) => row.id),
      ).toEqual([planAId]);
      await request(http)
        .get(`/api/v1/clients/me/nutrition-plans/${planBId}`)
        .set('Authorization', clientAuth)
        .expect(404);

      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planBId}/meals`)
        .set('Authorization', trainerBAuth)
        .send({
          meals: [
            meal('Lunch', NutritionMealType.LUNCH, [
              { foodId, quantityGrams: 120 },
            ]),
          ],
        })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planBId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      const activeCount = await plans.count({
        where: {
          clientProfileId: client.id,
          status: NutritionPlanStatus.ACTIVE,
        },
      });
      expect(activeCount).toBe(1);
      expect((await plans.findOneByOrFail({ id: planAId })).status).toBe(
        NutritionPlanStatus.ARCHIVED,
      );
      expect((await plans.findOneByOrFail({ id: planBId })).status).toBe(
        NutritionPlanStatus.ACTIVE,
      );

      const current = await request(http)
        .get('/api/v1/clients/me/nutrition-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(current.body.nutritionPlan.id).toBe(planBId);

      await request(http)
        .get(`/api/v1/clients/me/nutrition-plans/${planAId}`)
        .set('Authorization', clientAuth)
        .expect(200);
      await request(http)
        .get(`/api/v1/clients/me/nutrition-plans/${planAId}`)
        .set('Authorization', otherAuth)
        .expect(404);

      const planC = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerBAuth)
        .send({ name: 'Invalid Plan' })
        .expect(201);
      const planCId = readId(planC.body);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planCId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(409);
      expect((await plans.findOneByOrFail({ id: planBId })).status).toBe(
        NutritionPlanStatus.ACTIVE,
      );
      expect((await plans.findOneByOrFail({ id: planCId })).status).toBe(
        NutritionPlanStatus.DRAFT,
      );

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planBId}/status`)
        .set('Authorization', trainerBAuth)
        .send({ status: NutritionPlanStatus.ARCHIVED })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planBId}`)
        .set('Authorization', trainerBAuth)
        .send({ description: 'should fail' })
        .expect(409);
      const none = await request(http)
        .get('/api/v1/clients/me/nutrition-plans/current')
        .set('Authorization', clientAuth)
        .expect(200);
      expect(none.body.nutritionPlan).toBeNull();
    });
  });

  describe('archived food reactivation and disabled client', () => {
    it('blocks ARCHIVED plan reactivation when a source food is archived without touching another ACTIVE plan', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);

      const foodKeep = await createFood(trainerAuth, { name: 'Keep' });
      const foodSoon = await createFood(trainerAuth, { name: 'Soon Archived' });

      const planKeep = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Keep Active' })
        .expect(201);
      const planKeepId = readId(planKeep.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planKeepId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Dinner', NutritionMealType.DINNER, [
              { foodId: foodKeep, quantityGrams: 100 },
            ]),
          ],
        })
        .expect(200);

      const planOld = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Old Archived' })
        .expect(201);
      const planOldId = readId(planOld.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planOldId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Snack', NutritionMealType.SNACK, [
              { foodId: foodSoon, quantityGrams: 50 },
            ]),
          ],
        })
        .expect(200);
      await request(http)
        .patch(
          `/api/v1/clients/${client.id}/nutrition-plans/${planOldId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);
      await request(http)
        .patch(
          `/api/v1/clients/${client.id}/nutrition-plans/${planOldId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ARCHIVED })
        .expect(200);

      await request(http)
        .patch(
          `/api/v1/clients/${client.id}/nutrition-plans/${planKeepId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      await request(http)
        .patch(`/api/v1/nutrition/foods/${foodSoon}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionFoodStatus.ARCHIVED })
        .expect(200);

      await request(http)
        .patch(
          `/api/v1/clients/${client.id}/nutrition-plans/${planOldId}/status`,
        )
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(409);

      expect((await plans.findOneByOrFail({ id: planKeepId })).status).toBe(
        NutritionPlanStatus.ACTIVE,
      );
      expect((await plans.findOneByOrFail({ id: planOldId })).status).toBe(
        NutritionPlanStatus.ARCHIVED,
      );
    });

    it('keeps historical plans and rejects mutations while the client is disabled', async () => {
      const { authorization } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const foodId = await createFood(trainerAuth);
      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Keep Me' })
        .expect(201);
      const planId = readId(plan.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Breakfast', NutritionMealType.BREAKFAST, [
              { foodId, quantityGrams: 100 },
            ]),
          ],
        })
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
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'New' })
        .expect(409);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}`)
        .set('Authorization', trainerAuth)
        .send({ description: 'nope' })
        .expect(409);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Lunch', NutritionMealType.LUNCH, [
              { foodId, quantityGrams: 90 },
            ]),
          ],
        })
        .expect(409);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(409);
      await request(http)
        .get(`/api/v1/clients/${client.id}/nutrition-plans/${planId}`)
        .set('Authorization', authorization)
        .expect(200);

      await request(http)
        .patch(`/api/v1/clients/${client.id}/status`)
        .set('Authorization', authorization)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);
      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);
    });
  });

  describe('persistence integrity', () => {
    it('enforces FKs, date range, CHECKs and one ACTIVE plan per client', async () => {
      const { authorization, user: admin } = await createAdmin();
      const trainer = await provisionTrainer(authorization);
      const client = await provisionClient(authorization);
      await assign(authorization, client.id, trainer.id);
      const trainerAuth = await authHeader(trainer.user.email);
      const foodId = await createFood(trainerAuth);
      const plan = await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({
          name: 'Integrity',
          startDate: '2026-09-07',
          endDate: '2026-12-01',
        })
        .expect(201);
      const planId = readId(plan.body);
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            meal('Breakfast', NutritionMealType.BREAKFAST, [
              { foodId, quantityGrams: 100 },
            ]),
          ],
        })
        .expect(200);

      try {
        await plans.save(
          plans.create({
            clientProfileId: randomUUID(),
            name: 'Ghost',
            status: NutritionPlanStatus.DRAFT,
            createdByUserId: admin.id,
          }),
        );
        throw new Error('expected missing client to fail');
      } catch (error) {
        expect(isPostgresForeignKeyViolation(error)).toBe(true);
      }

      try {
        await dataSource.query(
          `INSERT INTO nutrition_plans (client_profile_id, name, status, created_by_user_id, start_date, end_date)
           VALUES ($1, $2, 'DRAFT', $3, '2026-12-01', '2026-09-01')`,
          [client.id, 'Bad Dates', admin.id],
        );
        throw new Error('expected date range to fail');
      } catch (error) {
        expect(isPostgresCheckViolation(error)).toBe(true);
      }

      const mealRow = await planMeals.findOneByOrFail({
        nutritionPlanId: planId,
      });
      try {
        await planItems.save(
          planItems.create({
            nutritionPlanMealId: mealRow.id,
            sourceFoodId: foodId,
            foodNameSnapshot: 'Dup',
            quantityGrams: 50,
            caloriesPer100gSnapshot: 10,
            proteinGPer100gSnapshot: 1,
            carbohydratesGPer100gSnapshot: 1,
            fatGPer100gSnapshot: 1,
            position: 1,
          }),
        );
        throw new Error('expected duplicate position to fail');
      } catch (error) {
        expect(isPostgresUniqueViolation(error)).toBe(true);
      }

      await request(http)
        .patch(`/api/v1/clients/${client.id}/nutrition-plans/${planId}/status`)
        .set('Authorization', trainerAuth)
        .send({ status: NutritionPlanStatus.ACTIVE })
        .expect(200);

      try {
        await plans.save(
          plans.create({
            clientProfileId: client.id,
            name: 'Second Active',
            status: NutritionPlanStatus.ACTIVE,
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
