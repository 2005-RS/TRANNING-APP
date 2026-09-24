import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { TrainingPlanStatus } from './enums/training-plan-status.enum';
import { TrainingPlan } from './entities/training-plan.entity';
import { TrainingPlansService } from './training-plans.service';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';

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

describe('TrainingPlansService', () => {
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
    requireUsable?: jest.Mock;
    requireActiveByIds?: jest.Mock;
    publish?: jest.Mock;
  }) {
    const plans = {
      create: jest.fn((value: Partial<TrainingPlan>) => value),
      save: jest.fn(async (value: TrainingPlan) => ({
        ...value,
        id: value.id ?? 'plan-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        workouts: [],
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
    const templates = {
      requireUsableTemplateWithItems: overrides?.requireUsable ?? jest.fn(),
    };
    const exercises = {
      requireActiveByIds:
        overrides?.requireActiveByIds ?? jest.fn(async () => []),
    };
    const publisher = {
      publish: overrides?.publish ?? jest.fn(async () => undefined),
    };
    const lockGetOne =
      overrides?.lockGetOne ??
      jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: TrainingPlanStatus.DRAFT,
        startDate: null,
        endDate: null,
      }));
    const workoutRepo = {
      delete: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
      find: jest.fn(async () => []),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => null),
      })),
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
        if (entity === TrainingPlan || entity?.name === 'TrainingPlan') {
          return planRepo;
        }
        return workoutRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
      ),
    };

    return {
      service: new TrainingPlansService(
        plans as never,
        clients as never,
        access as never,
        templates as never,
        exercises as never,
        publisher as never,
        dataSource as never,
      ),
      plans,
      access,
      clients,
      publisher,
      lockGetOne,
      workoutRepo,
    };
  }

  it('creates a DRAFT owned by the actor after relationship authorization', async () => {
    const { service, plans, access } = buildService();
    const created = await service.create(
      'client-1',
      { name: '  Hypertrophy   Phase 1  ' },
      actor({ id: 'trainer-a', role: UserRole.TRAINER }),
    );

    expect(access.assertCanAccessClient).toHaveBeenCalledWith(
      'trainer-a',
      'client-1',
    );
    expect(plans.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hypertrophy Phase 1',
        status: TrainingPlanStatus.DRAFT,
        createdByUserId: 'trainer-a',
        clientProfileId: 'client-1',
      }),
    );
    expect(created.workouts).toEqual([]);
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

  it('rejects empty workout replacement on an ACTIVE plan before deleting', async () => {
    const { service, workoutRepo } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: TrainingPlanStatus.ACTIVE,
      })),
    });

    await expect(
      service.replaceWorkouts(
        'client-1',
        'plan-1',
        [],
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(workoutRepo.delete).not.toHaveBeenCalled();
  });

  it('rejects activating a plan with no workouts', async () => {
    const { service } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: TrainingPlanStatus.DRAFT,
      })),
    });

    await expect(
      service.updateStatus(
        'client-1',
        'plan-1',
        'ACTIVE' as never,
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back activation when notification publishing fails', async () => {
    const lockGetOne = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'plan-1',
        clientProfileId: 'client-1',
        status: TrainingPlanStatus.DRAFT,
        startDate: null,
        endDate: null,
      })
      .mockResolvedValue(null);
    const { service, workoutRepo } = buildService({
      lockGetOne,
      publish: jest.fn(async () => {
        throw new Error('forced publisher failure');
      }),
    });
    workoutRepo.find.mockResolvedValue([
      {
        exercises: [
          {
            exerciseId: 'ex-1',
            sets: 3,
            prescriptionType: WorkoutPrescriptionType.REPS,
            repsMin: 8,
            repsMax: 10,
            restSeconds: 60,
            targetRir: 2,
          },
        ],
      },
    ] as never);

    await expect(
      service.updateStatus(
        'client-1',
        'plan-1',
        'ACTIVE' as never,
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).rejects.toThrow('forced publisher failure');
  });
});
