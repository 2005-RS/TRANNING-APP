import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { NutritionPlan } from './entities/nutrition-plan.entity';
import { NutritionPlanMealItem } from './entities/nutrition-plan-meal-item.entity';
import { NutritionMealType } from './enums/nutrition-meal-type.enum';
import { NutritionPlanLifecycleStatus } from './enums/nutrition-plan-lifecycle-status.enum';
import { NutritionPlanStatus } from './enums/nutrition-plan-status.enum';
import { NutritionPlansService } from './nutrition-plans.service';

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

describe('NutritionPlansService', () => {
  const client = {
    id: 'client-1',
    userId: 'client-user',
    user: {
      id: 'client-user',
      status: UserStatus.ACTIVE,
      role: UserRole.CLIENT,
    },
  };

  function buildService(overrides?: {
    findByIdWithUser?: jest.Mock;
    assertCanAccessClient?: jest.Mock;
    lockGetOne?: jest.Mock;
    requireActiveFoodsByIds?: jest.Mock;
    mealSave?: jest.Mock;
    publish?: jest.Mock;
  }) {
    const plans = {
      create: jest.fn((value: Partial<NutritionPlan>) => value),
      save: jest.fn(async (value: NutritionPlan) => ({
        ...value,
        id: value.id ?? 'plan-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        meals: [],
      })),
      createQueryBuilder: jest.fn(),
    };
    const clients = {
      findByIdWithUser:
        overrides?.findByIdWithUser ?? jest.fn(async () => client),
      findByUserIdWithUser: jest.fn(async () => client),
      lockByIdWithUser: jest.fn(async () => client),
    };
    const access = {
      assertCanAccessClient:
        overrides?.assertCanAccessClient ?? jest.fn(async () => undefined),
    };
    const foods = {
      requireActiveFoodsByIds:
        overrides?.requireActiveFoodsByIds ?? jest.fn(async () => []),
    };
    const publisher = {
      publish: overrides?.publish ?? jest.fn(async () => undefined),
    };
    const lockGetOne =
      overrides?.lockGetOne ??
      jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: NutritionPlanStatus.DRAFT,
        startDate: null,
        endDate: null,
      }));
    const mealRepo = {
      delete: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: overrides?.mealSave ?? jest.fn(async (value: unknown) => value),
      find: jest.fn(async () => []),
      findOne: jest.fn(),
    };
    const itemRepo = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
      findOne: jest.fn(),
    };
    const planRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: lockGetOne,
      })),
      save: plans.save,
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity === NutritionPlan || entity?.name === 'NutritionPlan') {
          return planRepo;
        }
        if (
          entity === NutritionPlanMealItem ||
          entity?.name === 'NutritionPlanMealItem'
        ) {
          return itemRepo;
        }
        return mealRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
      ),
    };

    return {
      service: new NutritionPlansService(
        plans as never,
        clients as never,
        access as never,
        foods as never,
        publisher as never,
        dataSource as never,
      ),
      plans,
      access,
      foods,
      publisher,
      mealRepo,
      itemRepo,
      manager,
    };
  }

  it('creates a DRAFT owned by the actor after relationship authorization', async () => {
    const { service, plans, access } = buildService();
    const created = await service.create(
      'client-1',
      { name: '  Hypertrophy   Nutrition  ' },
      actor({ id: 'trainer-a', role: UserRole.TRAINER }),
    );

    expect(access.assertCanAccessClient).toHaveBeenCalledWith(
      'trainer-a',
      'client-1',
    );
    expect(plans.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hypertrophy Nutrition',
        status: NutritionPlanStatus.DRAFT,
        createdByUserId: 'trainer-a',
        clientProfileId: 'client-1',
      }),
    );
    expect(created.meals).toEqual([]);
  });

  it('hides unassigned trainer access as not found', async () => {
    const { service } = buildService({
      assertCanAccessClient: jest.fn(async () => {
        throw new NotFoundException('Client not found');
      }),
    });

    await expect(
      service.create(
        'client-1',
        { name: 'Plan' },
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not let CLIENT manage plans', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        'client-1',
        { name: 'Plan' },
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects mutations for a disabled client', async () => {
    const { service } = buildService({
      findByIdWithUser: jest.fn(async () => ({
        ...client,
        user: { ...client.user, status: UserStatus.DISABLED },
      })),
    });

    await expect(
      service.create(
        'client-1',
        { name: 'Plan' },
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects empty meal replacement on an ACTIVE plan before deleting', async () => {
    const { service, mealRepo } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: NutritionPlanStatus.ACTIVE,
      })),
    });

    await expect(
      service.replaceMeals(
        'client-1',
        'plan-1',
        [],
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mealRepo.delete).not.toHaveBeenCalled();
  });

  it('validates foods with the same EntityManager before deleting meals', async () => {
    const { service, foods, mealRepo, manager } = buildService({
      requireActiveFoodsByIds: jest.fn(async () => {
        throw new ConflictException('Food is archived');
      }),
    });

    await expect(
      service.replaceMeals(
        'client-1',
        'plan-1',
        [
          {
            name: 'Breakfast',
            mealType: NutritionMealType.BREAKFAST,
            items: [{ foodId: 'food-archived', quantityGrams: 100 }],
          },
        ],
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(foods.requireActiveFoodsByIds).toHaveBeenCalledWith(
      ['food-archived'],
      manager,
    );
    expect(mealRepo.delete).not.toHaveBeenCalled();
  });

  it('rolls back when meal persistence fails after old meals are deleted', async () => {
    const { service, mealRepo } = buildService({
      requireActiveFoodsByIds: jest.fn(async () => [
        {
          id: 'food-1',
          name: 'Oats',
          brand: null,
          caloriesPer100g: 389,
          proteinGPer100g: 16.9,
          carbohydratesGPer100g: 66.3,
          fatGPer100g: 6.9,
          fiberGPer100g: null,
        },
      ]),
      mealSave: jest.fn(async () => {
        throw new Error('forced save failure');
      }),
    });

    await expect(
      service.replaceMeals(
        'client-1',
        'plan-1',
        [
          {
            name: 'Breakfast',
            mealType: NutritionMealType.BREAKFAST,
            items: [{ foodId: 'food-1', quantityGrams: 80 }],
          },
        ],
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toThrow('forced save failure');
    expect(mealRepo.delete).toHaveBeenCalled();
  });

  it('rejects activating a plan with no meals', async () => {
    const { service } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: NutritionPlanStatus.DRAFT,
      })),
    });

    await expect(
      service.updateStatus(
        'client-1',
        'plan-1',
        NutritionPlanLifecycleStatus.ACTIVE,
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back nutrition activation when notification publishing fails', async () => {
    const lockGetOne = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: NutritionPlanStatus.DRAFT,
        startDate: null,
        endDate: null,
      })
      .mockResolvedValue(null);
    const { service, mealRepo } = buildService({
      lockGetOne,
      publish: jest.fn(async () => {
        throw new Error('forced publisher failure');
      }),
    });
    mealRepo.find.mockResolvedValue([
      {
        items: [{ sourceFoodId: 'food-1' }],
      },
    ] as never);

    await expect(
      service.updateStatus(
        'client-1',
        'plan-1',
        NutritionPlanLifecycleStatus.ACTIVE,
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).rejects.toThrow('forced publisher failure');
  });
});
