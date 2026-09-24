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
} from '../src/database/postgres-errors';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { NutritionFood } from '../src/modules/nutrition-foods/entities/nutrition-food.entity';
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

describe('Nutrition foods (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let foods: Repository<NutritionFood>;
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
    foods = dataSource.getRepository(NutritionFood);
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

  function foodBody(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Chicken Breast',
      caloriesPer100g: 165,
      proteinGPer100g: 31,
      carbohydratesGPer100g: 0,
      fatGPer100g: 3.6,
      ...overrides,
    };
  }

  it('shares ACTIVE foods, scopes mutation to creator, and hides archived foods from other trainers', async () => {
    const { authorization } = await createAdmin();
    const trainerA = await provisionTrainer(authorization);
    const trainerB = await provisionTrainer(authorization, {
      email: 'trainer-b@example.com',
      firstName: 'Bea',
    });
    const client = await provisionClient(authorization);
    const trainerAAuth = await authHeader(trainerA.user.email);
    const trainerBAuth = await authHeader(trainerB.user.email);
    const clientAuth = await authHeader(client.user.email);

    const created = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAAuth)
      .send(foodBody({ name: '  Chicken   Breast ', brand: '  Farm  ' }))
      .expect(201);
    const foodId = readId(created.body);
    expect(created.body.name).toBe('Chicken Breast');
    expect(created.body.brand).toBe('Farm');
    expect(created.body.status).toBe(NutritionFoodStatus.ACTIVE);
    expect(created.body.createdByUserId).toBe(trainerA.user.id);
    expect(created.body.nutritionPer100g).toEqual({
      caloriesKcal: 165,
      proteinG: 31,
      carbohydratesG: 0,
      fatG: 3.6,
      fiberG: null,
    });

    await request(http)
      .get(`/api/v1/nutrition/foods/${foodId}`)
      .set('Authorization', trainerBAuth)
      .expect(200);
    await request(http)
      .patch(`/api/v1/nutrition/foods/${foodId}`)
      .set('Authorization', trainerBAuth)
      .send({ name: 'Hijack' })
      .expect(404);
    await request(http)
      .patch(`/api/v1/nutrition/foods/${foodId}`)
      .set('Authorization', authorization)
      .send({ description: 'Admin edit' })
      .expect(200);

    await request(http)
      .get('/api/v1/nutrition/foods')
      .set('Authorization', clientAuth)
      .expect(403);
    await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', clientAuth)
      .send(foodBody())
      .expect(403);

    await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAAuth)
      .send({
        ...foodBody({ name: 'Hijack' }),
        createdByUserId: randomUUID(),
        status: NutritionFoodStatus.ARCHIVED,
        id: randomUUID(),
      })
      .expect(400);

    await request(http)
      .patch(`/api/v1/nutrition/foods/${foodId}/status`)
      .set('Authorization', trainerAAuth)
      .send({ status: NutritionFoodStatus.ARCHIVED })
      .expect(200);

    const activeList = await request(http)
      .get('/api/v1/nutrition/foods')
      .set('Authorization', trainerBAuth)
      .expect(200);
    expect(
      activeList.body.data.map((row: { id: string }) => row.id),
    ).not.toContain(foodId);
    await request(http)
      .get(`/api/v1/nutrition/foods/${foodId}`)
      .set('Authorization', trainerBAuth)
      .expect(404);
    await request(http)
      .get(`/api/v1/nutrition/foods/${foodId}`)
      .set('Authorization', trainerAAuth)
      .expect(200);

    const oats = await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAAuth)
      .send(foodBody({ name: 'Rolled Oats', brand: 'Quaker' }))
      .expect(201);
    const search = await request(http)
      .get('/api/v1/nutrition/foods')
      .query({ search: 'quak%er' })
      .set('Authorization', trainerBAuth)
      .expect(200);
    expect(search.body.data.map((row: { id: string }) => row.id)).toEqual([]);
    const brandSearch = await request(http)
      .get('/api/v1/nutrition/foods')
      .query({ search: 'Quaker' })
      .set('Authorization', trainerBAuth)
      .expect(200);
    expect(brandSearch.body.data.map((row: { id: string }) => row.id)).toEqual([
      readId(oats.body),
    ]);
  });

  it('enforces food CHECKs and creator FK', async () => {
    const { authorization, user: admin } = await createAdmin();
    const trainer = await provisionTrainer(authorization);
    const trainerAuth = await authHeader(trainer.user.email);
    await request(http)
      .post('/api/v1/nutrition/foods')
      .set('Authorization', trainerAuth)
      .send(foodBody())
      .expect(201);

    try {
      await foods.save(
        foods.create({
          name: 'Ghost',
          caloriesPer100g: 10,
          proteinGPer100g: 1,
          carbohydratesGPer100g: 1,
          fatGPer100g: 1,
          status: NutritionFoodStatus.ACTIVE,
          createdByUserId: randomUUID(),
        }),
      );
      throw new Error('expected missing creator to fail');
    } catch (error) {
      expect(isPostgresForeignKeyViolation(error)).toBe(true);
    }

    try {
      await dataSource.query(
        `INSERT INTO nutrition_foods (
          name, calories_per_100g, protein_g_per_100g, carbohydrates_g_per_100g,
          fat_g_per_100g, created_by_user_id
        ) VALUES ('Bad', -1, 0, 0, 0, $1)`,
        [admin.id],
      );
      throw new Error('expected calorie check to fail');
    } catch (error) {
      expect(isPostgresCheckViolation(error)).toBe(true);
    }
  });
});
