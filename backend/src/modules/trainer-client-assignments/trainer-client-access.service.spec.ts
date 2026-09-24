import { NotFoundException } from '@nestjs/common';
import { TrainerClientAccessService } from './trainer-client-access.service';

describe('TrainerClientAccessService', () => {
  it('grants access only for an active assignment owned by the trainer', async () => {
    const getOne = jest.fn().mockResolvedValue({ id: 'assignment-1' });
    const assignments = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne,
      })),
    };
    const service = new TrainerClientAccessService(assignments as never);

    await expect(
      service.canAccessClient('trainer-user', 'client-1'),
    ).resolves.toBe(true);
    await service.assertCanAccessClient('trainer-user', 'client-1');
  });

  it('hides unassigned clients as not found', async () => {
    const assignments = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };
    const service = new TrainerClientAccessService(assignments as never);

    await expect(
      service.canAccessClient('trainer-user', 'client-1'),
    ).resolves.toBe(false);
    await expect(
      service.assertCanAccessClient('trainer-user', 'client-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the current trainer user id or null when unassigned', async () => {
    const assigned = {
      findOne: jest.fn(async () => ({
        trainerProfile: { userId: 'trainer-user' },
      })),
      createQueryBuilder: jest.fn(),
    };
    const assignedService = new TrainerClientAccessService(assigned as never);
    await expect(
      assignedService.findCurrentTrainerUserId('client-1'),
    ).resolves.toBe('trainer-user');

    const unassigned = {
      findOne: jest.fn(async () => null),
      createQueryBuilder: jest.fn(),
    };
    const unassignedService = new TrainerClientAccessService(
      unassigned as never,
    );
    await expect(
      unassignedService.findCurrentTrainerUserId('client-1'),
    ).resolves.toBeNull();
  });
});
