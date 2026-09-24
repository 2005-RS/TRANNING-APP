import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { BodyMeasurementsService } from './body-measurements.service';
import { BodyMeasurement } from './entities/body-measurement.entity';

function actor(
  overrides: Partial<AuthenticatedUser> & { id: string; role: UserRole },
): AuthenticatedUser {
  return {
    email: 'client@example.com',
    firstName: 'Cara',
    lastName: 'Client',
    status: UserStatus.ACTIVE,
    sessionId: 'session-1',
    ...overrides,
  };
}

const client = actor({ id: 'user-1', role: UserRole.CLIENT });

function row(overrides: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return {
    id: 'm-1',
    clientProfileId: 'client-1',
    measuredAt: new Date('2026-08-01T12:00:00.000Z'),
    bodyWeightKg: 82.5,
    bodyFatPercentage: null,
    neckCm: null,
    shouldersCm: null,
    chestCm: null,
    waistCm: 85,
    hipsCm: null,
    leftArmCm: null,
    rightArmCm: null,
    leftThighCm: null,
    rightThighCm: null,
    leftCalfCm: null,
    rightCalfCm: null,
    notes: null,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    ...overrides,
  } as BodyMeasurement;
}

describe('BodyMeasurementsService', () => {
  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    create?: jest.Mock;
  }) {
    const measurements = {
      create:
        overrides?.create ??
        jest.fn((value: Partial<BodyMeasurement>) => ({ ...value })),
      save:
        overrides?.save ??
        jest.fn(async (value: BodyMeasurement) => ({
          ...row(),
          ...value,
        })),
      findOne: overrides?.findOne ?? jest.fn().mockResolvedValue(row()),
      createQueryBuilder: jest.fn(),
    };
    const clients = {
      findByUserIdWithUser: jest.fn().mockResolvedValue({
        id: 'client-1',
        user: { status: UserStatus.ACTIVE },
      }),
      findByIdWithUser: jest.fn().mockResolvedValue({ id: 'client-1' }),
    };
    const access = {
      assertCanAccessClient: jest.fn(),
    };

    return {
      service: new BodyMeasurementsService(
        measurements as never,
        clients as never,
        access as never,
      ),
      measurements,
    };
  }

  it('allows backdated measurements and rejects times beyond clock skew', async () => {
    const { service, measurements } = buildService();
    await service.createMine(
      { bodyWeightKg: 80, measuredAt: '2024-01-15T08:00:00.000Z' },
      client,
    );
    expect(measurements.save).toHaveBeenCalledWith(
      expect.objectContaining({
        measuredAt: new Date('2024-01-15T08:00:00.000Z'),
      }),
    );

    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await expect(
      service.createMine({ bodyWeightKg: 80, measuredAt: future }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects notes-only creates at the service layer', async () => {
    const { service } = buildService();
    await expect(
      service.createMine({ notes: 'hello' }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates the merged PATCH state and keeps untouched metrics', async () => {
    const { service, measurements } = buildService();
    const updated = await service.updateMine(
      'm-1',
      { bodyWeightKg: 81.8 },
      client,
    );
    expect(updated.bodyWeightKg).toBe(81.8);
    expect(updated.waistCm).toBe(85);
    expect(measurements.save).toHaveBeenCalledWith(
      expect.objectContaining({ bodyWeightKg: 81.8, waistCm: 85 }),
    );

    await expect(
      service.updateMine(
        'm-1',
        {
          bodyWeightKg: null,
          waistCm: null,
        },
        client,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
