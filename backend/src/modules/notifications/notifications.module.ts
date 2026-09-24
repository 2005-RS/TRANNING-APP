import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEventsModule } from '../activity-events/activity-events.module';
import { Notification } from './entities/notification.entity';
import { NotificationPublisherService } from './notification-publisher.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), ActivityEventsModule],
  // Static /notifications/unread-count and /notifications/read-all must
  // register before /notifications/:notificationId/read.
  controllers: [NotificationsController],
  providers: [NotificationPublisherService, NotificationsService],
  exports: [NotificationPublisherService],
})
export class NotificationsModule {}
