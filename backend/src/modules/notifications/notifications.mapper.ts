import { Notification } from './entities/notification.entity';
import {
  NotificationResponseDto,
  PaginationMetaDto,
} from './dto/notification-response.dto';

export function paginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetaDto {
  return {
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
}

export function toNotificationResponse(
  notification: Notification,
): NotificationResponseDto {
  const event = notification.activityEvent;
  return {
    id: notification.id,
    type: event.type,
    clientProfileId: event.clientProfileId,
    relatedEntity: {
      type: event.relatedEntityType,
      id: event.relatedEntityId,
    },
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
