import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { WorkoutSessionExercise } from './entities/workout-session-exercise.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { WorkoutSessionStatus } from './enums/workout-session-status.enum';
import { WorkoutSessionsService } from './workout-sessions.service';

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

describe('WorkoutSessionsService', () => {
  const client = {
    id: 'client-1',
    userId: 'client-user',
    user: {
      id: 'client-user',
      status: UserStatus.ACTIVE,
      role: UserRole.CLIENT,
    },
  };

  const detailSession = {
    id: 'session-1',
    clientProfileId: 'client-1',
    trainingPlanId: 'plan-1',
    sourceTrainingPlanWorkoutId: 'plan-workout-1',
    workoutNameSnapshot: 'Push Day',
    workoutDescriptionSnapshot: null,
    scheduledDaySnapshot: 'MONDAY',
    status: WorkoutSessionStatus.IN_PROGRESS,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    exercises: [
      {
        id: 'se-1',
        sourceTrainingPlanExerciseId: 'plan-ex-1',
        exerciseId: 'ex-1',
        exerciseNameSnapshot: 'Barbell Bench Press',
        position: 1,
        prescribedSets: 4,
        prescriptionType: WorkoutPrescriptionType.REPS,
        prescribedRepsMin: 8,
        prescribedRepsMax: 10,
        prescribedDurationSeconds: null,
        prescribedRestSeconds: 120,
        prescribedTargetLoadKg: 80,
        prescribedTargetRpe: null,
        prescribedTargetRir: 2,
        prescribedTempo: null,
        prescribedNotes: null,
        sets: [],
      },
    ],
  };

  function detailQueryBuilder() {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => detailSession),
    };
  }

  function buildService(overrides?: {
    assertCanAccessClient?: jest.Mock;
    inProgressGetOne?: jest.Mock;
    setCount?: number;
  }) {
    const sessions = {
      createQueryBuilder: jest.fn(() => detailQueryBuilder()),
    };
    const clients = {
      findByUserIdWithUser: jest.fn(async () => client),
      findByIdWithUser: jest.fn(async () => client),
      lockByIdWithUser: jest.fn(async () => client),
    };
    const access = {
      assertCanAccessClient:
        overrides?.assertCanAccessClient ?? jest.fn(async () => undefined),
    };
    const plans = {
      requireActivePlanWorkoutForClient: jest.fn(async () => ({
        plan: { id: 'plan-1' },
        workout: {
          id: 'plan-workout-1',
          nameSnapshot: 'Push Day',
          descriptionSnapshot: null,
          scheduledDay: 'MONDAY',
        },
        exercises: detailSession.exercises.map((item) => ({
          id: item.sourceTrainingPlanExerciseId,
          exerciseId: item.exerciseId,
          exerciseNameSnapshot: item.exerciseNameSnapshot,
          position: item.position,
          sets: item.prescribedSets,
          prescriptionType: item.prescriptionType,
          repsMin: item.prescribedRepsMin,
          repsMax: item.prescribedRepsMax,
          durationSeconds: item.prescribedDurationSeconds,
          restSeconds: item.prescribedRestSeconds,
          targetLoadKg: item.prescribedTargetLoadKg,
          targetRpe: item.prescribedTargetRpe,
          targetRir: item.prescribedTargetRir,
          tempo: item.prescribedTempo,
          notes: item.prescribedNotes,
        })),
      })),
    };
    const sessionGetOne =
      overrides?.inProgressGetOne ??
      jest.fn(async () =>
        overrides?.setCount === undefined
          ? null
          : {
              id: 'session-1',
              clientProfileId: 'client-1',
              status: WorkoutSessionStatus.IN_PROGRESS,
            },
      );
    const sessionWriteRepo = {
      create: jest.fn((value: Partial<WorkoutSession>) => value),
      save: jest.fn(async (value: WorkoutSession) => ({
        ...value,
        id: 'session-1',
      })),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => ({
          id: 'session-1',
          clientProfileId: 'client-1',
          status: WorkoutSessionStatus.IN_PROGRESS,
        })),
      })),
    };
    const exerciseRepo = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
      findOne: jest.fn(async () => ({
        id: 'se-1',
        workoutSessionId: 'session-1',
        prescriptionType: WorkoutPrescriptionType.REPS,
      })),
    };
    const setRepo = {
      delete: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => overrides?.setCount ?? 0),
      })),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === WorkoutSession) {
          return {
            create: sessionWriteRepo.create,
            save: sessionWriteRepo.save,
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: sessionGetOne,
            })),
          };
        }
        if (entity === WorkoutSessionExercise) {
          return exerciseRepo;
        }
        if (entity === WorkoutSet) {
          return setRepo;
        }
        return sessionWriteRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
      ),
    };

    return {
      service: new WorkoutSessionsService(
        sessions as never,
        clients as never,
        access as never,
        plans as never,
        dataSource as never,
        {
          findReadyDemonstrations: jest.fn(async () => new Map()),
        } as never,
      ),
      plans,
      access,
    };
  }

  it('starts a session from the ACTIVE plan workout after locking the client', async () => {
    const { service, plans } = buildService();
    const created = await service.start(
      { trainingPlanWorkoutId: 'plan-workout-1' },
      actor({ id: 'client-user', role: UserRole.CLIENT }),
    );

    expect(plans.requireActivePlanWorkoutForClient).toHaveBeenCalledWith(
      'client-1',
      'plan-workout-1',
      expect.anything(),
    );
    expect(created.workoutName).toBe('Push Day');
    expect(created.exercises[0].prescription.targetLoadKg).toBe(80);
  });

  it('rejects a second IN_PROGRESS start', async () => {
    const { service } = buildService({
      inProgressGetOne: jest.fn(async () => ({ id: 'session-open' })),
    });

    await expect(
      service.start(
        { trainingPlanWorkoutId: 'plan-workout-1' },
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not let TRAINER start a session', async () => {
    const { service } = buildService();
    await expect(
      service.start(
        { trainingPlanWorkoutId: 'plan-workout-1' },
        actor({ id: 'trainer-a', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides unassigned trainer reads as not found', async () => {
    const { service } = buildService({
      assertCanAccessClient: jest.fn(async () => {
        throw new NotFoundException('Client not found');
      }),
    });

    await expect(
      service.listForClient(
        'client-1',
        { page: 1, limit: 20 },
        actor({ id: 'trainer-b', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects completing a session with no recorded sets', async () => {
    const { service } = buildService({ setCount: 0 });
    await expect(
      service.updateStatus(
        'session-1',
        'COMPLETED' as never,
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
