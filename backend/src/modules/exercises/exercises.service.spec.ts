import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ExerciseDifficultyLevel } from './enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from './enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from './enums/exercise-muscle-group.enum';
import { ExerciseStatus } from './enums/exercise-status.enum';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT', [], {
    code: '23505',
  } as Error & { code: string });
}

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

describe('ExercisesService', () => {
  const createDto = {
    name: '  Barbell   Bench Press ',
    description: '  Horizontal press  ',
    instructions: 'Lower to chest.',
    primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
    equipmentType: ExerciseEquipmentType.BARBELL,
    difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
  };

  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    find?: jest.Mock;
  }) {
    const exercises = {
      create: jest.fn((value: Partial<Exercise>) => value),
      save:
        overrides?.save ??
        jest.fn(async (value: Exercise) => ({
          ...value,
          id: 'ex-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      findOne: overrides?.findOne ?? jest.fn(),
      find: overrides?.find ?? jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    return {
      service: new ExercisesService(exercises as never),
      exercises,
    };
  }

  it('creates an ACTIVE exercise owned by the authenticated user', async () => {
    const { service, exercises } = buildService();
    const created = await service.create(
      createDto,
      actor({ id: 'trainer-1', role: UserRole.TRAINER }),
    );

    expect(exercises.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Barbell Bench Press',
        description: 'Horizontal press',
        status: ExerciseStatus.ACTIVE,
        createdByUserId: 'trainer-1',
      }),
    );
    expect(created.status).toBe(ExerciseStatus.ACTIVE);
    expect(created.createdByUserId).toBe('trainer-1');
  });

  it('maps duplicate creator names to a conflict', async () => {
    const { service } = buildService({
      save: jest.fn().mockRejectedValue(uniqueViolation()),
    });

    await expect(
      service.create(
        createDto,
        actor({ id: 'trainer-1', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hides another trainer exercise on mutation as not found', async () => {
    const { service } = buildService({
      findOne: jest.fn().mockResolvedValue({
        id: 'ex-1',
        createdByUserId: 'trainer-a',
        status: ExerciseStatus.ACTIVE,
      }),
    });

    await expect(
      service.update(
        'ex-1',
        { name: 'New Name' },
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects archived exercises for future assignment lookup', async () => {
    const archived = {
      id: 'ex-1',
      status: ExerciseStatus.ARCHIVED,
    };
    const { service } = buildService({
      findOne: jest.fn().mockResolvedValue(archived),
      find: jest.fn().mockResolvedValue([archived]),
    });

    await expect(service.requireActiveExercise('ex-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.requireActiveByIds(['ex-1'])).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns unknown exercises as not found for active lookup', async () => {
    const { service } = buildService({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    });

    await expect(
      service.requireActiveExercise('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.requireActiveByIds(['missing']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exposes catalog read and mutation ownership helpers', async () => {
    const exercise = {
      id: 'ex-1',
      createdByUserId: 'trainer-a',
      status: ExerciseStatus.ACTIVE,
    };
    const { service } = buildService({
      findOne: jest.fn().mockResolvedValue(exercise),
    });

    await expect(service.requireExerciseById('ex-1')).resolves.toEqual(
      exercise,
    );
    await expect(
      service.requireExerciseMutationAccess(
        'ex-1',
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).resolves.toEqual(exercise);
    await expect(
      service.requireExerciseMutationAccess(
        'ex-1',
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.requireExerciseMutationAccess(
        'ex-1',
        actor({ id: 'admin-1', role: UserRole.ADMIN }),
      ),
    ).resolves.toEqual(exercise);
  });
});
