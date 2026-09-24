import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ActivityEventEntityType } from '../activity-events/enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { NotificationsService } from './notifications.service';
import { NotificationReadState } from './enums/notification-read-state.enum';

function actor(id: string): AuthenticatedUser {
  return {
    id,
    email: `${id}@example.com`,
    firstName: 'Pat',
    lastName: 'User',
    role: UserRole.TRAINER,
    status: UserStatus.ACTIVE,
    sessionId: 'session-1',
  };
}

describe('NotificationsService', () => {
  it('counts unread rows with SQL count rather than loading entities', async () => {
    const count = jest.fn(async () => 3);
    const service = new NotificationsService({
      count,
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as never);

    await expect(service.unreadCountMine(actor('user-a'))).resolves.toEqual({
      unreadCount: 3,
    });
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recipientUserId: 'user-a' }),
      }),
    );
  });

  it('keeps the original readAt on repeated mark-read', async () => {
    const readAt = new Date('2026-09-01T12:00:00.000Z');
    const save = jest.fn();
    const service = new NotificationsService({
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(async () => ({
        id: 'n-1',
        recipientUserId: 'user-a',
        readAt,
        createdAt: readAt,
        activityEvent: {
          type: ActivityEventType.CHECK_IN_SUBMITTED,
          clientProfileId: 'client-1',
          relatedEntityType: ActivityEventEntityType.CHECK_IN,
          relatedEntityId: 'check-in-1',
        },
      })),
      save,
      update: jest.fn(),
    } as never);

    const first = await service.markReadMine('n-1', actor('user-a'));
    const second = await service.markReadMine('n-1', actor('user-a'));
    expect(save).not.toHaveBeenCalled();
    expect(first.readAt).toEqual(readAt);
    expect(second.readAt).toEqual(readAt);
  });

  it('hides foreign notifications as not found', async () => {
    const service = new NotificationsService({
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(async () => null),
      save: jest.fn(),
      update: jest.fn(),
    } as never);

    await expect(
      service.markReadMine('n-other', actor('user-a')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only the current recipient and supports unread filtering', async () => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
    };
    const service = new NotificationsService({
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as never);

    await service.listMine(
      {
        page: 1,
        limit: 20,
        readState: NotificationReadState.UNREAD,
      },
      actor('user-a'),
    );

    expect(qb.where).toHaveBeenCalledWith(
      'notification.recipientUserId = :recipientUserId',
      { recipientUserId: 'user-a' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('notification.readAt IS NULL');
  });
});
