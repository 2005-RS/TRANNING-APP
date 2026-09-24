import { EntityManager } from 'typeorm';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { ActivityEventEntityType } from '../activity-events/enums/activity-event-entity-type.enum';
import { NotificationPublisherService } from './notification-publisher.service';
import { Notification } from './entities/notification.entity';

describe('NotificationPublisherService', () => {
  function build(insert?: jest.Mock) {
    const activityEvents = {
      insert:
        insert ??
        jest.fn(async () => ({
          id: 'event-1',
          type: ActivityEventType.CHECK_IN_SUBMITTED,
        })),
    };
    const save = jest.fn(async (value: Notification) => ({
      ...value,
      id: 'notification-1',
    }));
    const create = jest.fn((value: Partial<Notification>) => value);
    const manager = {
      getRepository: jest.fn(() => ({ save, create })),
    };
    return {
      service: new NotificationPublisherService(activityEvents as never),
      activityEvents,
      save,
      manager,
    };
  }

  it('creates an ActivityEvent and recipient Notification in the same manager', async () => {
    const { service, activityEvents, save, manager } = build();

    await service.publish(manager as unknown as EntityManager, {
      type: ActivityEventType.CHECK_IN_REVIEWED,
      actorUserId: 'trainer-a',
      clientProfileId: 'client-1',
      relatedEntityId: 'check-in-1',
      recipientUserId: 'client-user',
    });

    expect(activityEvents.insert).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        type: ActivityEventType.CHECK_IN_REVIEWED,
        relatedEntityType: ActivityEventEntityType.CHECK_IN,
        relatedEntityId: 'check-in-1',
      }),
    );
    expect(manager.getRepository).toHaveBeenCalledWith(Notification);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        activityEventId: 'event-1',
        recipientUserId: 'client-user',
        readAt: null,
      }),
    );
  });

  it('records CHECK_IN_SUBMITTED without a Notification when there is no trainer', async () => {
    const { service, save } = build();

    await service.publish({} as EntityManager, {
      type: ActivityEventType.CHECK_IN_SUBMITTED,
      actorUserId: 'client-user',
      clientProfileId: 'client-1',
      relatedEntityId: 'check-in-1',
      recipientUserId: null,
    });

    expect(save).not.toHaveBeenCalled();
  });
});
