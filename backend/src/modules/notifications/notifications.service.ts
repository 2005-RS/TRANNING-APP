import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  NOTIFICATION_LIST_DEFAULT_LIMIT,
  NOTIFICATION_LIST_DEFAULT_PAGE,
} from './notifications.constants';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  MarkAllReadResponseDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { Notification } from './entities/notification.entity';
import { NotificationReadState } from './enums/notification-read-state.enum';
import { paginationMeta, toNotificationResponse } from './notifications.mapper';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async listMine(
    query: ListNotificationsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedNotificationsResponseDto> {
    const page = query.page ?? NOTIFICATION_LIST_DEFAULT_PAGE;
    const limit = query.limit ?? NOTIFICATION_LIST_DEFAULT_LIMIT;
    const readState = query.readState ?? NotificationReadState.ALL;

    const qb = this.notifications
      .createQueryBuilder('notification')
      .innerJoinAndSelect('notification.activityEvent', 'event')
      .where('notification.recipientUserId = :recipientUserId', {
        recipientUserId: actor.id,
      });

    if (readState === NotificationReadState.UNREAD) {
      qb.andWhere('notification.readAt IS NULL');
    } else if (readState === NotificationReadState.READ) {
      qb.andWhere('notification.readAt IS NOT NULL');
    }
    if (query.type) {
      qb.andWhere('event.type = :type', { type: query.type });
    }

    qb.orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => toNotificationResponse(row)),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  async unreadCountMine(
    actor: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.notifications.count({
      where: { recipientUserId: actor.id, readAt: IsNull() },
    });
    return { unreadCount };
  }

  async markReadMine(
    notificationId: string,
    actor: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notifications.findOne({
      where: { id: notificationId, recipientUserId: actor.id },
      relations: { activityEvent: true },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readAt === null) {
      notification.readAt = new Date();
      await this.notifications.save(notification);
      this.logger.log(
        JSON.stringify({
          event: 'notification_marked_read',
          notificationId: notification.id,
          recipientUserId: actor.id,
        }),
      );
    }

    return toNotificationResponse(notification);
  }

  async markAllReadMine(
    actor: AuthenticatedUser,
  ): Promise<MarkAllReadResponseDto> {
    const result = await this.notifications.update(
      { recipientUserId: actor.id, readAt: IsNull() },
      { readAt: new Date() },
    );

    const updatedCount = result.affected ?? 0;
    this.logger.log(
      JSON.stringify({
        event: 'notifications_marked_read_all',
        recipientUserId: actor.id,
        updatedCount,
      }),
    );
    return { updatedCount };
  }
}
