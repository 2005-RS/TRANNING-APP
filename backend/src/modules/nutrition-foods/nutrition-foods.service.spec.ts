import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
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
    };

    return {
      service: new NutritionFoodsService(foods as never),
      foods,
    };
  }

  it('creates an ACTIVE food owned by the authenticated user', async () => {
    const { service, foods } = buildService();
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
