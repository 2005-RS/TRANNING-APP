import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { Nutrient } from '../nutrition-nutrients/entities/nutrient.entity';
import { FoodNutrient } from './entities/food-nutrient.entity';
import { NutritionFoodSource } from './enums/nutrition-food-source.enum';
import { NutritionFood } from './entities/nutrition-food.entity';
import { NutritionFoodStatus } from './enums/nutrition-food-status.enum';
import { NutritionFoodsService } from './nutrition-foods.service';

function actor(
  overrides: Partial<AuthenticatedUser> & { id: string; role: UserRole },
): AuthenticatedUser {
  return {
    email: 'user@example.com',
    firstName: 'Pat',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    sessionId: 'session-1',
    ...overrides,
  };
}

describe('NutritionFoodsService', () => {
  const createDto = {
    name: '  Chicken   Breast ',
    brand: '  Generic  ',
    description: '  Lean protein  ',
    caloriesPer100g: 165,
    proteinGPer100g: 31,
    carbohydratesGPer100g: 0,
    fatGPer100g: 3.6,
    fiberGPer100g: null,
  };

  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    find?: jest.Mock;
  }) {
    const coreNutrients = [
      ['energy_kcal', 'nutrient-energy'],
      ['protein_g', 'nutrient-protein'],
      ['carbohydrates_g', 'nutrient-carbohydrates'],
      ['fat_g', 'nutrient-fat'],
      ['fiber_g', 'nutrient-fiber'],
    ].map(([code, id]) => ({ id, code, isCore: true }));
    const foodNutrients = {
      save: jest.fn(async (value: unknown) => value),
      delete: jest.fn(async () => undefined),
    };
    const foods = {
      create: jest.fn((value: Partial<NutritionFood>) => value),
      save:
        overrides?.save ??
        jest.fn(async (value: NutritionFood) => ({
          ...value,
          id: 'food-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      findOne: overrides?.findOne ?? jest.fn(),
      find: overrides?.find ?? jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: undefined as unknown,
    };
    const nutrients = {
      find: jest.fn(async () => coreNutrients),
    };
    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === Nutrient) {
          return nutrients;
        }
        if (entity === FoodNutrient) {
          return foodNutrients;
        }
        return foods;
      },
    };
    foods.manager = {
      transaction: async (
        callback: (transactionManager: typeof manager) => unknown,
      ) => callback(manager),
    } as never;

    return {
      service: new NutritionFoodsService(foods as never),
      foods,
      foodNutrients,
    };
  }

  it('creates an ACTIVE food owned by the authenticated user', async () => {
    const createdFood = {
      id: 'food-1',
      ...createDto,
      status: NutritionFoodStatus.ACTIVE,
      source: NutritionFoodSource.MANUAL,
      nameOrigin: 'MANUAL',
      createdByUserId: 'trainer-1',
      externalId: null,
      sourceDataType: null,
      importedAt: null,
      nameOriginal: null,
      nameVerifiedAt: null,
      foodNutrients: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const { service, foods, foodNutrients } = buildService({
      findOne: jest.fn(async () => createdFood),
    });
    const created = await service.create(
      createDto,
      actor({ id: 'trainer-1', role: UserRole.TRAINER }),
    );

    expect(foods.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Chicken Breast',
        brand: 'Generic',
        status: NutritionFoodStatus.ACTIVE,
        createdByUserId: 'trainer-1',
      }),
    );
    expect(created.nutritionPer100g.caloriesKcal).toBe(165);
    expect(foodNutrients.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          nutrientId: 'nutrient-energy',
          amountPer100g: 165,
        }),
        expect.objectContaining({
          nutrientId: 'nutrient-fiber',
          amountPer100g: null,
        }),
      ]),
    );
  });

  it('updates every core nutrient alongside its cached food column', async () => {
    const existingFood = {
      id: 'food-1',
      ...createDto,
      status: NutritionFoodStatus.ACTIVE,
      source: NutritionFoodSource.MANUAL,
      nameOrigin: 'MANUAL',
      createdByUserId: 'trainer-1',
      externalId: null,
      sourceDataType: null,
      importedAt: null,
      nameOriginal: null,
      nameVerifiedAt: null,
      foodNutrients: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const { service, foods, foodNutrients } = buildService({
      findOne: jest.fn(async () => existingFood),
    });

    await service.update(
      'food-1',
      { caloriesPer100g: 200, fiberGPer100g: 4 },
      actor({ id: 'trainer-1', role: UserRole.TRAINER }),
    );

    expect(foods.save).toHaveBeenCalledWith(
      expect.objectContaining({
        caloriesPer100g: 200,
        proteinGPer100g: 31,
        carbohydratesGPer100g: 0,
        fatGPer100g: 3.6,
        fiberGPer100g: 4,
      }),
    );
    expect(foodNutrients.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          nutrientId: 'nutrient-energy',
          amountPer100g: 200,
          source: NutritionFoodSource.MANUAL,
        }),
        expect.objectContaining({
          nutrientId: 'nutrient-fiber',
          amountPer100g: 4,
          source: NutritionFoodSource.MANUAL,
        }),
        expect.objectContaining({
          nutrientId: 'nutrient-protein',
          amountPer100g: 31,
          source: NutritionFoodSource.MANUAL,
        }),
        expect.objectContaining({
          nutrientId: 'nutrient-carbohydrates',
          amountPer100g: 0,
          source: NutritionFoodSource.MANUAL,
        }),
        expect.objectContaining({
          nutrientId: 'nutrient-fat',
          amountPer100g: 3.6,
          source: NutritionFoodSource.MANUAL,
        }),
      ]),
    );
  });

  it('does not permit an AI food nutrient source', () => {
    expect(Object.values(NutritionFoodSource)).not.toContain('AI');
  });

  it('hides other-trainer mutation as not found', async () => {
    const { service } = buildService({
      findOne: jest.fn(async () => ({
        id: 'food-1',
        createdByUserId: 'trainer-a',
        status: NutritionFoodStatus.ACTIVE,
      })),
    });

    await expect(
      service.update(
        'food-1',
        { name: 'Hijack' },
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects archived foods for new snapshots', async () => {
    const { service } = buildService({
      find: jest.fn(async () => [
        {
          id: 'food-1',
          status: NutritionFoodStatus.ARCHIVED,
        },
      ]),
    });

    await expect(
      service.requireActiveFoodsByIds(['food-1']),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
