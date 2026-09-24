import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ExerciseStatus } from '../exercises/enums/exercise-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';
import { WorkoutTemplateLifecycleStatus } from './enums/workout-template-lifecycle-status.enum';
import { WorkoutTemplateStatus } from './enums/workout-template-status.enum';
import { WorkoutTemplateExercise } from './entities/workout-template-exercise.entity';
import { WorkoutTemplate } from './entities/workout-template.entity';
import { WorkoutTemplatesService } from './workout-templates.service';

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

describe('WorkoutTemplatesService', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-01T00:00:00.000Z');

  function buildService(overrides?: {
    findOne?: jest.Mock;
    requireActiveByIds?: jest.Mock;
    lockGetOne?: jest.Mock;
    loadItems?: jest.Mock;
  }) {
    const templates = {
      create: jest.fn((value: Partial<WorkoutTemplate>) => value),
      save: jest.fn(async (value: WorkoutTemplate) => ({
        ...value,
        id: value.id ?? 'tpl-1',
        createdAt,
        updatedAt,
      })),
      findOne:
        overrides?.findOne ??
        jest.fn(async () => ({
          id: 'tpl-1',
          name: 'Push Day',
          description: null,
          status: WorkoutTemplateStatus.DRAFT,
          createdByUserId: 'trainer-a',
          createdAt,
          updatedAt,
          items: [],
        })),
      createQueryBuilder: jest.fn(),
    };

    const templateExercises = {
      delete: jest.fn(),
      create: jest.fn((value: Partial<WorkoutTemplateExercise>) => value),
      save: jest.fn(),
      find: overrides?.loadItems ?? jest.fn(async () => []),
    };

    const lockGetOne =
      overrides?.lockGetOne ??
      jest.fn(async () => ({
        id: 'tpl-1',
        name: 'Push Day',
        description: null,
        status: WorkoutTemplateStatus.DRAFT,
        createdByUserId: 'trainer-a',
        createdAt,
        updatedAt,
      }));

    const templateRepo = {
      ...templates,
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: lockGetOne,
      })),
      save: templates.save,
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === WorkoutTemplate) {
          return templateRepo;
        }
        return templateExercises;
      }),
    };

    const dataSource = {
      transaction: jest.fn(
        async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
      ),
    };

    const exercises = {
      requireActiveByIds:
        overrides?.requireActiveByIds ?? jest.fn(async () => []),
    };

    return {
      service: new WorkoutTemplatesService(
        templates as never,
        exercises as never,
        dataSource as never,
      ),
      templates,
      templateExercises,
      exercises,
      dataSource,
      lockGetOne,
    };
  }

  it('creates a DRAFT owned by the authenticated user', async () => {
    const { service, templates } = buildService();
    const created = await service.create(
      { name: '  Push   Day  ', description: '  Upper  ' },
      actor({ id: 'trainer-1', role: UserRole.TRAINER }),
    );

    expect(templates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Push Day',
        description: 'Upper',
        status: WorkoutTemplateStatus.DRAFT,
        createdByUserId: 'trainer-1',
      }),
    );
    expect(created.status).toBe(WorkoutTemplateStatus.DRAFT);
    expect(created.items).toEqual([]);
  });

  it('hides another trainer template on mutation as not found', async () => {
    const { service } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'tpl-1',
        createdByUserId: 'trainer-a',
        status: WorkoutTemplateStatus.ACTIVE,
      })),
    });

    await expect(
      service.update(
        'tpl-1',
        { name: 'Hijack' },
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects edits to archived templates', async () => {
    const { service } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'tpl-1',
        createdByUserId: 'trainer-a',
        status: WorkoutTemplateStatus.ARCHIVED,
      })),
    });

    await expect(
      service.update(
        'tpl-1',
        { name: 'Still archived' },
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects activating a draft with no exercises', async () => {
    const { service } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'tpl-1',
        createdByUserId: 'trainer-a',
        status: WorkoutTemplateStatus.DRAFT,
      })),
      loadItems: jest.fn(async () => []),
    });

    await expect(
      service.updateStatus(
        'tpl-1',
        WorkoutTemplateLifecycleStatus.ACTIVE,
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects replacing an ACTIVE template with an empty list', async () => {
    const { service, templateExercises } = buildService({
      lockGetOne: jest.fn(async () => ({
        id: 'tpl-1',
        createdByUserId: 'trainer-a',
        status: WorkoutTemplateStatus.ACTIVE,
      })),
    });

    await expect(
      service.replaceExercises(
        'tpl-1',
        [],
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(templateExercises.delete).not.toHaveBeenCalled();
  });

  it('rejects requireUsableTemplate when the template is not ACTIVE', async () => {
    const { service } = buildService({
      findOne: jest.fn(async () => ({
        id: 'tpl-1',
        status: WorkoutTemplateStatus.DRAFT,
        items: [{ exerciseId: 'ex-1', position: 1 }],
      })),
    });

    await expect(service.requireUsableTemplate('tpl-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects requireUsableTemplate when a referenced exercise is archived', async () => {
    const { service, exercises } = buildService({
      findOne: jest.fn(async () => ({
        id: 'tpl-1',
        status: WorkoutTemplateStatus.ACTIVE,
        items: [{ exerciseId: 'ex-1', position: 1 }],
      })),
      requireActiveByIds: jest.fn(async () => {
        throw new ConflictException('Exercise is archived');
      }),
    });

    await expect(service.requireUsableTemplate('tpl-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(exercises.requireActiveByIds).toHaveBeenCalledWith(
      ['ex-1'],
      undefined,
    );
  });

  it('does not treat archived-exercise templates as deleted for catalog reads', async () => {
    const template = {
      id: 'tpl-1',
      name: 'Push Day',
      description: null,
      status: WorkoutTemplateStatus.ACTIVE,
      createdByUserId: 'trainer-a',
      createdAt,
      updatedAt,
      items: [
        {
          id: 'item-1',
          position: 1,
          sets: 4,
          prescriptionType: WorkoutPrescriptionType.REPS,
          repsMin: 8,
          repsMax: 10,
          durationSeconds: null,
          restSeconds: 120,
          targetRpe: null,
          targetRir: 2,
          tempo: null,
          notes: null,
          exercise: {
            id: 'ex-1',
            name: 'Bench',
            status: ExerciseStatus.ARCHIVED,
            primaryMuscleGroup: 'CHEST',
            equipmentType: 'BARBELL',
            difficultyLevel: 'INTERMEDIATE',
          },
        },
      ],
    };
    const { service } = buildService({
      findOne: jest.fn(async () => template),
    });

    const detail = await service.getById(
      'tpl-1',
      actor({ id: 'trainer-b', role: UserRole.TRAINER }),
    );
    expect(detail.status).toBe(WorkoutTemplateStatus.ACTIVE);
    expect(detail.items[0].exercise.status).toBe(ExerciseStatus.ARCHIVED);
  });
});
