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
import {
  OpenFoodFactsClient,
  OpenFoodFactsLookup,
} from '../src/modules/nutrition-journal/open-food-facts/open-food-facts.client';
import { NutritionMealType } from '../src/modules/nutrition-plans/enums/nutrition-meal-type.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

const PASSWORD = 'correct horse battery';

function isoDay(offsetDays = 0): string {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offsetDays,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

class FakeOpenFoodFacts {
  calls = 0;
  next: OpenFoodFactsLookup = { status: 'not_found' };

  lookupBarcode(): Promise<OpenFoodFactsLookup> {
    this.calls += 1;
    return Promise.resolve(this.next);
  }
}

describe('Nutrition journal (e2e)', () => {
  jest.setTimeout(90_000);
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let hasher: PasswordHasherService;
  const openFoodFacts = new FakeOpenFoodFacts();

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OpenFoodFactsClient)
      .useValue(openFoodFacts)
      .compile();
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
    openFoodFacts.calls = 0;
    openFoodFacts.next = { status: 'not_found' };
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  async function authHeader(email: string): Promise<string> {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return `Bearer ${response.body.accessToken as string}`;
  }

  /** Admin, assigned trainer, client with an ACTIVE plan (oats + chicken). */
  async function scenario() {
    const admin = await users.save(
      users.create({
        email: 'admin@example.com',
        passwordHash: await hasher.hash(PASSWORD),
        firstName: 'Ada',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const adminAuth = await authHeader(admin.email);
    const trainer = (
      await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', adminAuth)
        .send({
          email: 'trainer@example.com',
          password: PASSWORD,
          firstName: 'Tia',
          lastName: 'Trainer',
        })
        .expect(201)
    ).body as { id: string; user: { email: string } };
    const client = (
      await request(http)
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
        .expect(201)
    ).body as { id: string; user: { email: string } };
    await request(http)
      .put(`/api/v1/clients/${client.id}/trainer`)
      .set('Authorization', adminAuth)
      .send({ trainerId: trainer.id })
      .expect(200);
    const trainerAuth = await authHeader(trainer.user.email);
    const clientAuth = await authHeader(client.user.email);

    const oats = (
      await request(http)
        .post('/api/v1/nutrition/foods')
        .set('Authorization', trainerAuth)
        .send({
          name: 'Oats',
          caloriesPer100g: 389,
          proteinGPer100g: 16.9,
          carbohydratesGPer100g: 66.3,
          fatGPer100g: 6.9,
          fiberGPer100g: 10.6,
          nutrients: [{ code: 'sodium_mg', amountPer100g: 2 }],
        })
        .expect(201)
    ).body as { id: string };
    const chicken = (
      await request(http)
        .post('/api/v1/nutrition/foods')
        .set('Authorization', trainerAuth)
        .send({
          name: 'Chicken breast',
          caloriesPer100g: 165,
          proteinGPer100g: 31,
          carbohydratesGPer100g: 0,
          fatGPer100g: 3.6,
          portions: [{ label: '1 fillet', gramWeight: 150 }],
        })
        .expect(201)
    ).body as { id: string; portions: Array<{ id: string; label: string }> };

    const plan = (
      await request(http)
        .post(`/api/v1/clients/${client.id}/nutrition-plans`)
        .set('Authorization', trainerAuth)
        .send({ name: 'Cut', targetCaloriesKcal: 2000, targetProteinG: 150 })
        .expect(201)
    ).body as { id: string };
    const withMeals = (
      await request(http)
        .put(`/api/v1/clients/${client.id}/nutrition-plans/${plan.id}/meals`)
        .set('Authorization', trainerAuth)
        .send({
          meals: [
            {
              name: 'Oats bowl',
              mealType: NutritionMealType.BREAKFAST,
              items: [{ foodId: oats.id, quantityGrams: 80 }],
            },
            {
              name: 'Chicken plate',
              mealType: NutritionMealType.LUNCH,
              items: [{ foodId: chicken.id, quantityGrams: 150 }],
            },
          ],
        })
        .expect(200)
    ).body as { meals: Array<{ items: Array<{ id: string }> }> };
    await request(http)
      .patch(`/api/v1/clients/${client.id}/nutrition-plans/${plan.id}/status`)
      .set('Authorization', trainerAuth)
      .send({ status: 'ACTIVE' })
      .expect(200);

    return {
      adminAuth,
      trainerAuth,
      clientAuth,
      clientId: client.id,
      oats,
      chicken,
      oatsItemId: withMeals.meals[0].items[0].id,
      chickenItemId: withMeals.meals[1].items[0].id,
    };
  }

  it('builds the day from the plan and tracks eaten, replaced, skipped and extra food', async () => {
    const s = await scenario();
    const day = isoDay();
    const base = `/api/v1/clients/me/nutrition-journal/days/${day}`;

    const empty = await request(http)
      .get(base)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(empty.body.plan.name).toBe('Cut');
    expect(empty.body.targets).toMatchObject({
      caloriesKcal: 2000,
      proteinG: 150,
    });
    expect(
      empty.body.meals.map((meal: { mealType: string }) => meal.mealType),
    ).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']);
    // 80 g oats (311.2) + 150 g chicken (247.5).
    expect(empty.body.planned.caloriesKcal).toBe(558.7);
    expect(empty.body.consumed.caloriesKcal).toBe(0);
    expect(empty.body.remainingCaloriesKcal).toBe(2000);
    expect(empty.body.adherence).toEqual({
      plannedItems: 2,
      eaten: 0,
      replaced: 0,
      skipped: 0,
      pending: 2,
    });

    const eaten = await request(http)
      .post(`${base}/plan-items/${s.oatsItemId}/eaten`)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(eaten.body.meals[0].plannedItems[0].status).toBe('EATEN');
    expect(eaten.body.consumed.caloriesKcal).toBe(311.2);
    expect(eaten.body.remainingCaloriesKcal).toBe(1688.8);
    // Idempotent: marking twice never double counts.
    const again = await request(http)
      .post(`${base}/plan-items/${s.oatsItemId}/eaten`)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(again.body.consumed.caloriesKcal).toBe(311.2);

    // Replace the chicken with 2 × 1-fillet portions of chicken? Replace with oats 50 g instead.
    const replaced = await request(http)
      .post(`${base}/entries`)
      .set('Authorization', s.clientAuth)
      .send({
        mealType: NutritionMealType.DINNER,
        foodId: s.oats.id,
        grams: 50,
        planItemId: s.chickenItemId,
      })
      .expect(201);
    // A replacement keeps the prescribed item's meal.
    expect(replaced.body).toMatchObject({
      mealType: 'LUNCH',
      grams: 50,
      foodName: 'Oats',
    });

    const extra = await request(http)
      .post(`${base}/entries`)
      .set('Authorization', s.clientAuth)
      .send({
        mealType: NutritionMealType.SNACK,
        foodId: s.chicken.id,
        portionId: s.chicken.portions[0].id,
        portionQuantity: 0.5,
      })
      .expect(201);
    expect(extra.body).toMatchObject({
      grams: 75,
      portionLabel: '1 fillet',
      portionQuantity: 0.5,
    });
    expect(extra.body.nutrition.caloriesKcal).toBe(123.75);

    const full = await request(http)
      .get(base)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(full.body.adherence).toMatchObject({
      eaten: 1,
      replaced: 1,
      pending: 0,
    });
    expect(full.body.meals[1].plannedItems[0].status).toBe('REPLACED');
    expect(full.body.meals[3].extraEntries).toHaveLength(1);
    // 311.2 + 194.5 (50 g oats) + 123.75.
    expect(full.body.consumed.caloriesKcal).toBe(629.45);

    const edited = await request(http)
      .patch(
        `/api/v1/clients/me/nutrition-journal/entries/${extra.body.id as string}`,
      )
      .set('Authorization', s.clientAuth)
      .send({ grams: 150 })
      .expect(200);
    expect(edited.body.nutrition.caloriesKcal).toBe(247.5);
    expect(edited.body.portionLabel).toBeNull();

    await request(http)
      .post(`${base}/entries`)
      .set('Authorization', s.clientAuth)
      .send({
        mealType: 'SNACK',
        foodId: s.oats.id,
        grams: 10,
        portionQuantity: 1,
      })
      .expect(400);

    const skipped = await request(http)
      .post(`${base}/plan-items/${s.oatsItemId}/skip`)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(skipped.body.meals[0].plannedItems[0].status).toBe('SKIPPED');
    const undone = await request(http)
      .delete(`${base}/plan-items/${s.oatsItemId}`)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(undone.body.meals[0].plannedItems[0].status).toBe('PENDING');

    await request(http)
      .delete(
        `/api/v1/clients/me/nutrition-journal/entries/${extra.body.id as string}`,
      )
      .set('Authorization', s.clientAuth)
      .expect(204);

    // Outside the editable window: read works, writes conflict.
    const old = isoDay(-30);
    await request(http)
      .get(`/api/v1/clients/me/nutrition-journal/days/${old}`)
      .set('Authorization', s.clientAuth)
      .expect(200)
      .expect((response) => expect(response.body.editable).toBe(false));
    await request(http)
      .post(
        `/api/v1/clients/me/nutrition-journal/days/${old}/plan-items/${s.oatsItemId}/eaten`,
      )
      .set('Authorization', s.clientAuth)
      .expect(409);
    await request(http)
      .get('/api/v1/clients/me/nutrition-journal/days/2026-02-30')
      .set('Authorization', s.clientAuth)
      .expect(400);
  });

  it('keeps the journal private: assigned TRAINER reads, ADMIN and others cannot (D5)', async () => {
    const s = await scenario();
    const day = isoDay();
    await request(http)
      .post(
        `/api/v1/clients/me/nutrition-journal/days/${day}/plan-items/${s.oatsItemId}/eaten`,
      )
      .set('Authorization', s.clientAuth)
      .expect(200);

    const trainerView = await request(http)
      .get(`/api/v1/clients/${s.clientId}/nutrition-journal/days/${day}`)
      .set('Authorization', s.trainerAuth)
      .expect(200);
    expect(trainerView.body.editable).toBe(false);
    expect(trainerView.body.adherence.eaten).toBe(1);

    await request(http)
      .get(`/api/v1/clients/${s.clientId}/nutrition-journal/days/${day}`)
      .set('Authorization', s.adminAuth)
      .expect(403);
    await request(http)
      .get(`/api/v1/clients/me/nutrition-journal/days/${day}`)
      .set('Authorization', s.trainerAuth)
      .expect(403);
    await request(http)
      .post(`/api/v1/clients/me/nutrition-foods`)
      .set('Authorization', s.trainerAuth)
      .send({})
      .expect(403);
  });

  it('lets a Client create PRIVATE foods that never reach the professional catalog (U2)', async () => {
    const s = await scenario();
    const created = await request(http)
      .post('/api/v1/clients/me/nutrition-foods')
      .set('Authorization', s.clientAuth)
      .send({
        name: 'Protein bar',
        portionLabel: '1 bar',
        portionGrams: 60,
        caloriesKcal: 220,
        proteinG: 20,
        carbohydratesG: 22,
        fatG: 7,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      visibility: 'PRIVATE',
      source: 'MANUAL',
      portions: [{ label: '1 bar', gramWeight: 60, isDefault: true }],
    });
    expect(created.body.nutritionPer100g.caloriesKcal).toBe(366.67);

    await request(http)
      .post('/api/v1/clients/me/nutrition-foods')
      .set('Authorization', s.clientAuth)
      .send({
        name: 'Bad',
        source: 'USDA_FDC',
        portionGrams: 10,
        caloriesKcal: 1,
        proteinG: 0,
        carbohydratesG: 0,
        fatG: 0,
      })
      .expect(400);

    const own = await request(http)
      .get('/api/v1/clients/me/nutrition-foods?search=protein')
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(own.body.data).toEqual([
      expect.objectContaining({
        name: 'Protein bar',
        isOwn: true,
        defaultPortion: expect.objectContaining({ caloriesKcal: 220 }),
      }),
    ]);

    const professional = await request(http)
      .get('/api/v1/nutrition/foods?search=protein')
      .set('Authorization', s.trainerAuth)
      .expect(200);
    expect(professional.body.data).toHaveLength(0);
    await request(http)
      .get(`/api/v1/nutrition/foods/${created.body.id as string}`)
      .set('Authorization', s.adminAuth)
      .expect(404);

    const plan = await request(http)
      .get('/api/v1/clients/me/nutrition-foods?scope=PLAN')
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(
      plan.body.data.map((food: { name: string }) => food.name).sort(),
    ).toEqual(['Chicken breast', 'Oats']);
    expect(
      plan.body.data.every((food: { inPlan: boolean }) => food.inPlan),
    ).toBe(true);

    await request(http)
      .post(`/api/v1/clients/me/nutrition-journal/days/${isoDay()}/entries`)
      .set('Authorization', s.clientAuth)
      .send({ mealType: 'SNACK', foodId: created.body.id, grams: 30 })
      .expect(201);
    const recent = await request(http)
      .get('/api/v1/clients/me/nutrition-foods?scope=RECENT')
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(recent.body.data[0].name).toBe('Protein bar');
  });

  it('imports a barcode from Open Food Facts once and reuses it locally (D4)', async () => {
    const s = await scenario();
    openFoodFacts.next = {
      status: 'found',
      product: {
        code: '3017620422003',
        product_name: 'Hazelnut spread',
        product_name_es: 'Crema de avellanas',
        brands: 'Brand A, Brand B',
        serving_quantity: '15',
        serving_size: '15 g',
        nutriments: {
          'energy-kcal_100g': 539,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
          sugars_100g: '56.3',
          sodium_100g: 0.0428,
          'vitamin-c_100g': -1,
        },
      },
    };

    const first = await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/3017620422003')
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(first.body).toMatchObject({
      name: 'Crema de avellanas',
      nameOriginal: 'Hazelnut spread',
      nameOrigin: 'SOURCE',
      brand: 'Brand A',
      source: 'OPEN_FOOD_FACTS',
      externalId: '3017620422003',
      visibility: 'GLOBAL',
      portions: [expect.objectContaining({ label: '15 g', gramWeight: 15 })],
    });
    const byCode = new Map(
      (
        first.body.nutrients as Array<{
          code: string;
          amountPer100g: number | null;
          source: string;
        }>
      ).map((nutrient) => [nutrient.code, nutrient]),
    );
    expect(byCode.get('sodium_mg')?.amountPer100g).toBe(42.8);
    expect(byCode.get('sugars_g')?.amountPer100g).toBe(56.3);
    // Negative/missing values stay unknown (null), never 0.
    expect(byCode.get('vitamin_c_mg')?.amountPer100g).toBeNull();
    expect(byCode.get('energy_kcal')?.source).toBe('OPEN_FOOD_FACTS');

    const second = await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/3017620422003')
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(second.body.id).toBe(first.body.id);
    expect(openFoodFacts.calls).toBe(1);

    openFoodFacts.next = { status: 'not_found' };
    await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/12345678')
      .set('Authorization', s.clientAuth)
      .expect(404);
    openFoodFacts.next = { status: 'unavailable' };
    await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/87654321')
      .set('Authorization', s.clientAuth)
      .expect(503);
    openFoodFacts.next = {
      status: 'found',
      product: {
        product_name: 'No macros',
        nutriments: { 'energy-kcal_100g': 100 },
      },
    };
    await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/11112222')
      .set('Authorization', s.clientAuth)
      .expect(422);
    await request(http)
      .get('/api/v1/clients/me/nutrition-foods/barcode/abc')
      .set('Authorization', s.clientAuth)
      .expect(400);
  });

  it('keeps skipped history when the trainer later replaces the plan meals', async () => {
    const s = await scenario();
    const day = isoDay();
    await request(http)
      .post(
        `/api/v1/clients/me/nutrition-journal/days/${day}/plan-items/${s.oatsItemId}/skip`,
      )
      .set('Authorization', s.clientAuth)
      .expect(200);

    const plans = await request(http)
      .get(`/api/v1/clients/${s.clientId}/nutrition-plans`)
      .set('Authorization', s.trainerAuth)
      .expect(200);
    const planId = plans.body.data[0].id as string;
    await request(http)
      .put(`/api/v1/clients/${s.clientId}/nutrition-plans/${planId}/meals`)
      .set('Authorization', s.trainerAuth)
      .send({
        meals: [
          {
            name: 'New breakfast',
            mealType: NutritionMealType.BREAKFAST,
            items: [{ foodId: s.chicken.id, quantityGrams: 100 }],
          },
        ],
      })
      .expect(200);

    const view = await request(http)
      .get(`/api/v1/clients/me/nutrition-journal/days/${day}`)
      .set('Authorization', s.clientAuth)
      .expect(200);
    expect(view.body.adherence).toMatchObject({ plannedItems: 1, pending: 1 });
  });
});
