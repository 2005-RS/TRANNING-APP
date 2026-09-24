import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ProgressService } from './progress.service';

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

describe('ProgressService', () => {
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
    query?: jest.Mock;
    assertCanAccessClient?: jest.Mock;
    findByIdWithUser?: jest.Mock;
    findByUserIdWithUser?: jest.Mock;
  }) {
    const dataSource = {
      query: overrides?.query ?? jest.fn(async () => []),
    };
    const clients = {
      findByIdWithUser:
        overrides?.findByIdWithUser ?? jest.fn(async () => client),
      findByUserIdWithUser:
        overrides?.findByUserIdWithUser ?? jest.fn(async () => client),
    };
    const access = {
      assertCanAccessClient:
        overrides?.assertCanAccessClient ?? jest.fn(async () => undefined),
    };
    const service = new ProgressService(
      dataSource as never,
      clients as never,
      access as never,
    );
    return { service, dataSource, clients, access };
  }

  it('returns zero metrics for a Client with no completed history', async () => {
    const { service } = buildService({
      query: jest.fn(async () => [
        {
          completed_sessions: 0,
          performed_sets: 0,
          exercises_performed: 0,
          total_reps: 0,
          external_load_volume_kg: 0,
          total_duration_seconds: 0,
          first_completed_session_at: null,
          last_completed_session_at: null,
        },
      ]),
    });

    await expect(
      service.getSummaryMine(
        {},
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).resolves.toEqual({
      completedSessions: 0,
      performedSets: 0,
      exercisesPerformed: 0,
      totalReps: 0,
      externalLoadVolumeKg: 0,
      totalDurationSeconds: 0,
      firstCompletedSessionAt: null,
      lastCompletedSessionAt: null,
    });
  });

  it('rejects dateTo before dateFrom', async () => {
    const { service } = buildService();
    await expect(
      service.getSummaryMine(
        { dateFrom: '2026-02-01', dateTo: '2026-01-01' },
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids CLIENT on management reads and unassigned trainers with 404', async () => {
    const { service, access } = buildService({
      assertCanAccessClient: jest.fn(async () => {
        throw new NotFoundException('Client not found');
      }),
    });

    await expect(
      service.getSummaryForClient(
        'client-1',
        {},
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.getSummaryForClient(
        'client-1',
        {},
        actor({ id: 'trainer-user', role: UserRole.TRAINER }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertCanAccessClient).toHaveBeenCalledWith(
      'trainer-user',
      'client-1',
    );
  });

  it('returns 404 when the Client has never performed the Exercise', async () => {
    const { service } = buildService({
      query: jest.fn(async () => []),
    });

    await expect(
      service.getExerciseMine(
        '11111111-1111-4111-8111-111111111111',
        {},
        actor({ id: 'client-user', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
