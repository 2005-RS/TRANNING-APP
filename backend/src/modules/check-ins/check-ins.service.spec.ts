import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { CheckInsService } from './check-ins.service';
import { CheckInReview } from './entities/check-in-review.entity';
import { CheckIn } from './entities/check-in.entity';
import { CheckInStatus } from './enums/check-in-status.enum';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';

function uniqueViolation(constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT', [], {
    code: '23505',
    constraint,
  } as Error & { code: string; constraint: string });
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

const clientUser = actor({ id: 'client-user', role: UserRole.CLIENT });
const trainerA = actor({ id: 'trainer-a', role: UserRole.TRAINER });
const trainerB = actor({ id: 'trainer-b', role: UserRole.TRAINER });
const admin = actor({ id: 'admin-1', role: UserRole.ADMIN });

function draftRow(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'check-in-1',
    clientProfileId: 'client-1',
    periodStart: '2026-08-24',
    periodEnd: '2026-08-30',
    status: CheckInStatus.DRAFT,
    sleepQuality: null,
    energyLevel: null,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: null,
    trainingAdherencePct: null,
    nutritionAdherencePct: null,
    wins: null,
    challenges: null,
    generalNotes: null,
    submittedAt: null,
    createdAt: new Date('2026-08-24T00:00:00.000Z'),
    updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    ...overrides,
  } as CheckIn;
}

describe('CheckInsService', () => {
  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    lockGetOne?: jest.Mock;
    detailGetOne?: jest.Mock;
    reviewSave?: jest.Mock;
    assertCanAccessClient?: jest.Mock;
    findCurrentTrainerUserId?: jest.Mock;
    publish?: jest.Mock;
  }) {
    const savedDraft = draftRow();
    const checkIns = {
      create: jest.fn((value: Partial<CheckIn>) => ({ ...value })),
      save:
        overrides?.save ??
        jest.fn(async (value: CheckIn) => ({
          ...savedDraft,
          ...value,
        })),
      findOne: overrides?.findOne ?? jest.fn(async () => draftRow()),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne:
          overrides?.detailGetOne ??
          jest.fn(async () => draftRow({ energyLevel: 4 })),
        getManyAndCount: jest.fn(async () => [[], 0]),
      })),
    };
    const clients = {
      findByUserIdWithUser: jest.fn(async () => ({
        id: 'client-1',
        user: { status: UserStatus.ACTIVE },
      })),
      findByIdWithUser: jest.fn(async () => ({
        id: 'client-1',
        user: { status: UserStatus.ACTIVE },
      })),
    };
    const access = {
      assertCanAccessClient:
        overrides?.assertCanAccessClient ?? jest.fn(async () => undefined),
      findCurrentTrainerUserId:
        overrides?.findCurrentTrainerUserId ?? jest.fn(async () => 'trainer-a'),
    };
    const publisher = {
      publish: overrides?.publish ?? jest.fn(async () => undefined),
    };
    const submitted = draftRow({
      status: CheckInStatus.SUBMITTED,
      energyLevel: 4,
      submittedAt: new Date('2026-08-30T12:00:00.000Z'),
    });
    const checkInSave = jest.fn(async (value: CheckIn) => value);
    const reviewSave =
      overrides?.reviewSave ??
      jest.fn(async (value: CheckInReview) => ({
        ...value,
        id: 'review-1',
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
        updatedAt: new Date('2026-08-31T00:00:00.000Z'),
      }));
    const lockGetOne = overrides?.lockGetOne ?? jest.fn(async () => submitted);
    const checkInRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: lockGetOne,
      })),
      save: checkInSave,
      delete: jest.fn(),
    };
    const reviewRepo = {
      create: jest.fn((value: Partial<CheckInReview>) => value),
      save: reviewSave,
      findOne: jest.fn(),
    };
    const clientProfileRepo = {
      findOne: jest.fn(async () => ({
        id: 'client-1',
        userId: 'client-user',
      })),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity === CheckInReview || entity?.name === 'CheckInReview') {
          return reviewRepo;
        }
        if (entity === ClientProfile || entity?.name === 'ClientProfile') {
          return clientProfileRepo;
        }
        return checkInRepo;
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
      ),
    };

    return {
      service: new CheckInsService(
        checkIns as never,
        clients as never,
        access as never,
        publisher as never,
        dataSource as never,
      ),
      checkIns,
      access,
      publisher,
      checkInSave,
      reviewSave,
      reviewRepo,
    };
  }

  it('creates a DRAFT owned by the Client', async () => {
    const { service, checkIns } = buildService();
    const created = await service.createMine(
      { periodStart: '2026-08-24', periodEnd: '2026-08-30' },
      clientUser,
    );

    expect(checkIns.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProfileId: 'client-1',
        status: CheckInStatus.DRAFT,
        submittedAt: null,
        periodStart: '2026-08-24',
        periodEnd: '2026-08-30',
      }),
    );
    expect(created.status).toBe(CheckInStatus.DRAFT);
    expect(created.review).toBeNull();
  });

  it('maps an exact-period unique violation to 409', async () => {
    const { service } = buildService({
      save: jest.fn(async () => {
        throw uniqueViolation('UQ_check_ins_client_period');
      }),
    });

    await expect(
      service.createMine(
        { periodStart: '2026-08-24', periodEnd: '2026-08-30' },
        clientUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects empty submit and accepts a substantive rating', async () => {
    const emptyLock = jest
      .fn()
      .mockResolvedValueOnce(draftRow())
      .mockResolvedValueOnce(draftRow({ energyLevel: 4 }));
    const { service } = buildService({
      lockGetOne: emptyLock,
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
    });

    await expect(
      service.submitMine('check-in-1', clientUser),
    ).rejects.toBeInstanceOf(ConflictException);

    const submitted = await service.submitMine('check-in-1', clientUser);
    expect(submitted.status).toBe(CheckInStatus.SUBMITTED);
  });

  it('does not change submittedAt on idempotent resubmit', async () => {
    const submittedAt = new Date('2026-08-30T12:00:00.000Z');
    const lockGetOne = jest.fn(async () =>
      draftRow({
        status: CheckInStatus.SUBMITTED,
        energyLevel: 4,
        submittedAt,
      }),
    );
    const { service, checkInSave } = buildService({
      lockGetOne,
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt,
        }),
      ),
    });

    const result = await service.submitMine('check-in-1', clientUser);
    expect(checkInSave).not.toHaveBeenCalled();
    expect(result.submittedAt).toEqual(submittedAt);
  });

  it('does not publish a second event on idempotent resubmit', async () => {
    const submittedAt = new Date('2026-08-30T12:00:00.000Z');
    const { service, publisher } = buildService({
      lockGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt,
        }),
      ),
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt,
        }),
      ),
    });

    await service.submitMine('check-in-1', clientUser);
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('publishes CHECK_IN_SUBMITTED to the current trainer on first submit', async () => {
    const { service, publisher } = buildService({
      lockGetOne: jest.fn(async () => draftRow({ energyLevel: 4 })),
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
    });

    await service.submitMine('check-in-1', clientUser);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: ActivityEventType.CHECK_IN_SUBMITTED,
        actorUserId: 'client-user',
        clientProfileId: 'client-1',
        relatedEntityId: 'check-in-1',
        recipientUserId: 'trainer-a',
      }),
    );
  });

  it('records an event without a notification when no trainer is assigned', async () => {
    const { service, publisher } = buildService({
      findCurrentTrainerUserId: jest.fn(async () => null),
      lockGetOne: jest.fn(async () => draftRow({ energyLevel: 4 })),
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.SUBMITTED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
    });

    await service.submitMine('check-in-1', clientUser);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: ActivityEventType.CHECK_IN_SUBMITTED,
        recipientUserId: null,
      }),
    );
  });

  it('hides DRAFT CheckIns from management detail', async () => {
    const { service } = buildService({
      detailGetOne: jest.fn(async () => draftRow()),
    });

    await expect(
      service.getForClient('client-1', 'check-in-1', trainerA),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getForClient('client-1', 'check-in-1', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not let ADMIN create a review', async () => {
    const { service } = buildService();
    await expect(
      service.createReview(
        'client-1',
        'check-in-1',
        { feedback: 'Keep the current load.' },
        admin,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rolls back CheckIn status when review insert fails', async () => {
    const { service, checkInSave } = buildService({
      reviewSave: jest.fn(async () => {
        throw new Error('forced review insert failure');
      }),
    });

    await expect(
      service.createReview(
        'client-1',
        'check-in-1',
        { feedback: 'Keep the current load.' },
        trainerA,
      ),
    ).rejects.toThrow('forced review insert failure');
    expect(checkInSave).not.toHaveBeenCalled();
  });

  it('rolls back CheckIn status when notification publishing fails', async () => {
    const { service } = buildService({
      publish: jest.fn(async () => {
        throw new Error('forced publisher failure');
      }),
    });

    await expect(
      service.createReview(
        'client-1',
        'check-in-1',
        { feedback: 'Keep the current load.' },
        trainerA,
      ),
    ).rejects.toThrow('forced publisher failure');
  });

  it('does not publish when a Trainer edits an existing review', async () => {
    const { service, publisher, reviewRepo } = buildService({
      lockGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.REVIEWED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
      detailGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.REVIEWED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
    });
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      checkInId: 'check-in-1',
      reviewedByUserId: 'trainer-a',
      feedback: 'Original',
      actionItems: null,
    });

    await service.updateReview(
      'client-1',
      'check-in-1',
      { feedback: 'Adjusted notes.' },
      trainerA,
    );
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('rejects review updates by a different current trainer', async () => {
    const { service, reviewRepo } = buildService({
      lockGetOne: jest.fn(async () =>
        draftRow({
          status: CheckInStatus.REVIEWED,
          energyLevel: 4,
          submittedAt: new Date('2026-08-30T12:00:00.000Z'),
        }),
      ),
    });
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      checkInId: 'check-in-1',
      reviewedByUserId: 'trainer-a',
      feedback: 'Original',
      actionItems: null,
    });

    await expect(
      service.updateReview(
        'client-1',
        'check-in-1',
        { feedback: 'Overwrite' },
        trainerB,
      ),
    ).rejects.toThrow('Review belongs to a different reviewer');
  });

  it('rejects periods longer than 31 days before persistence', async () => {
    const { service, checkIns } = buildService();
    await expect(
      service.createMine(
        { periodStart: '2026-08-01', periodEnd: '2026-09-02' },
        clientUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(checkIns.save).not.toHaveBeenCalled();
  });
});
