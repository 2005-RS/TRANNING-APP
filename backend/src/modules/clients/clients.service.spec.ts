import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ClientsService } from './clients.service';
import { ClientExperienceLevel } from './enums/client-experience-level.enum';
import { ClientPrimaryGoal } from './enums/client-primary-goal.enum';
import { ClientProfile } from './entities/client-profile.entity';

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT', [], {
    code: '23505',
  } as Error & { code: string });
}

describe('ClientsService', () => {
  const passwordHash = 'argon2-hash';
  const createDto = {
    email: 'client@example.com',
    password: 'correct horse battery',
    firstName: 'Cara',
    lastName: 'Client',
    primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
    experienceLevel: ClientExperienceLevel.BEGINNER,
  };

  function buildService(overrides?: {
    hash?: jest.Mock;
    createClientUser?: jest.Mock;
    profileSave?: jest.Mock;
  }) {
    const profiles = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((value: Partial<ClientProfile>) => value),
      save: overrides?.profileSave ?? jest.fn(),
    };
    const users = {
      createClientUser:
        overrides?.createClientUser ??
        jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'client@example.com',
          firstName: 'Cara',
          lastName: 'Client',
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
        }),
      updateIdentity: jest.fn(),
      updateStatus: jest.fn(),
      findByIdWithManager: jest.fn(),
    };
    const passwords = {
      hash: overrides?.hash ?? jest.fn().mockResolvedValue(passwordHash),
    };
    const sessions = {
      revokeAllForUser: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(
        async (work: (manager: unknown) => Promise<unknown>) =>
          work({
            getRepository: () => profiles,
          }),
      ),
    };

    const service = new ClientsService(
      profiles as never,
      users as never,
      passwords as never,
      sessions as never,
      dataSource as never,
    );

    return { service, users, passwords, dataSource };
  }

  it('rejects passwords that fail the shared policy before opening a transaction', async () => {
    const { service, passwords, dataSource } = buildService();

    await expect(
      service.create({
        ...createDto,
        password: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(passwords.hash).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('hashes the password before the create transaction', async () => {
    const hash = jest.fn().mockResolvedValue(passwordHash);
    const createClientUser = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'client@example.com',
      firstName: 'Cara',
      lastName: 'Client',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    });
    const profileSave = jest.fn().mockImplementation(async (profile) => ({
      ...profile,
      id: 'profile-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const { service } = buildService({ hash, createClientUser, profileSave });

    await service.create(createDto);

    expect(hash).toHaveBeenCalledWith(createDto.password);
    expect(hash.mock.invocationCallOrder[0]).toBeLessThan(
      createClientUser.mock.invocationCallOrder[0],
    );
    expect(createClientUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ passwordHash }),
    );
  });

  it('maps unique violations to a generic email conflict', async () => {
    const { service } = buildService({
      createClientUser: jest.fn().mockRejectedValue(uniqueViolation()),
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create(createDto)).rejects.toThrow(
      'Email already in use',
    );
  });

  it('does not swallow profile save failures so the transaction can roll back', async () => {
    const createClientUser = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'client@example.com',
      firstName: 'Cara',
      lastName: 'Client',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    });
    const { service } = buildService({
      createClientUser,
      profileSave: jest
        .fn()
        .mockRejectedValue(new Error('simulated client profile failure')),
    });

    await expect(service.create(createDto)).rejects.toThrow(
      'simulated client profile failure',
    );
    expect(createClientUser).toHaveBeenCalled();
  });
});
