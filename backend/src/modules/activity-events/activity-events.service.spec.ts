import { EntityManager } from 'typeorm';
import { ActivityEventsService } from './activity-events.service';
import { ActivityEventEntityType } from './enums/activity-event-entity-type.enum';
import { ActivityEventType } from './enums/activity-event-type.enum';
import { ActivityEvent } from './entities/activity-event.entity';

describe('ActivityEventsService', () => {
  it('inserts an immutable event through the supplied transaction manager', async () => {
    const save = jest.fn(async (value: ActivityEvent) => ({
      ...value,
      id: 'event-1',
      createdAt: new Date('2026-09-03T00:00:00.000Z'),
    }));
    const create = jest.fn((value: Partial<ActivityEvent>) => value);
    const manager = {
      getRepository: jest.fn(() => ({ save, create })),
    };
    const service = new ActivityEventsService();

    const saved = await service.insert(manager as unknown as EntityManager, {
      type: ActivityEventType.CHECK_IN_SUBMITTED,
      actorUserId: 'client-user',
      clientProfileId: 'client-1',
      relatedEntityType: ActivityEventEntityType.CHECK_IN,
      relatedEntityId: 'check-in-1',
    });

    expect(manager.getRepository).toHaveBeenCalledWith(ActivityEvent);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityEventType.CHECK_IN_SUBMITTED,
        actorUserId: 'client-user',
        relatedEntityId: 'check-in-1',
      }),
    );
    expect(saved.id).toBe('event-1');
  });

  it('does not expose generic update or delete', () => {
    const methods = Object.getOwnPropertyNames(ActivityEventsService.prototype);
    expect(methods).not.toContain('update');
    expect(methods).not.toContain('delete');
    expect(methods).not.toContain('remove');
    expect(methods).toContain('insert');
  });
});
