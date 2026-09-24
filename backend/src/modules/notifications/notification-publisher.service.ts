import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ActivityEventsService } from '../activity-events/activity-events.service';
import { ActivityEventEntityType } from '../activity-events/enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { Notification } from './entities/notification.entity';
import { PublishActivityCommand } from './publish-activity.command';

const RELATED_ENTITY_TYPE: Record<ActivityEventType, ActivityEventEntityType> =
  {
    [ActivityEventType.CHECK_IN_SUBMITTED]: ActivityEventEntityType.CHECK_IN,
    [ActivityEventType.CHECK_IN_REVIEWED]: ActivityEventEntityType.CHECK_IN,
    [ActivityEventType.TRAINING_PLAN_ACTIVATED]:
      ActivityEventEntityType.TRAINING_PLAN,
    [ActivityEventType.NUTRITION_PLAN_ACTIVATED]:
      ActivityEventEntityType.NUTRITION_PLAN,
  };

@Injectable()
export class NotificationPublisherService {
  private readonly logger = new Logger(NotificationPublisherService.name);

  constructor(private readonly activityEvents: ActivityEventsService) {}

  async publish(
    manager: EntityManager,
    command: PublishActivityCommand,
  ): Promise<void> {
    const activityEvent = await this.activityEvents.insert(manager, {
      type: command.type,
      actorUserId: command.actorUserId,
      clientProfileId: command.clientProfileId,
      relatedEntityType: RELATED_ENTITY_TYPE[command.type],
      relatedEntityId: command.relatedEntityId,
    });

    this.logger.log(
      JSON.stringify({
        event: 'activity_event_recorded',
        activityEventId: activityEvent.id,
        type: command.type,
        actorUserId: command.actorUserId,
        clientProfileId: command.clientProfileId,
      }),
    );

    if (!command.recipientUserId) {
      return;
    }

    const notifications = manager.getRepository(Notification);
    const notification = await notifications.save(
      notifications.create({
        activityEventId: activityEvent.id,
        recipientUserId: command.recipientUserId,
        readAt: null,
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'notification_created',
        notificationId: notification.id,
        activityEventId: activityEvent.id,
        recipientUserId: command.recipientUserId,
      }),
    );
  }
}
