import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ActivityEventType } from '../../activity-events/enums/activity-event-type.enum';
import {
  NOTIFICATION_LIST_DEFAULT_LIMIT,
  NOTIFICATION_LIST_DEFAULT_PAGE,
  NOTIFICATION_LIST_MAX_LIMIT,
} from '../notifications.constants';
import { NotificationReadState } from '../enums/notification-read-state.enum';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    default: NOTIFICATION_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = NOTIFICATION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: NOTIFICATION_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: NOTIFICATION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NOTIFICATION_LIST_MAX_LIMIT)
  limit: number = NOTIFICATION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    enum: NotificationReadState,
    default: NotificationReadState.ALL,
    description:
      'Filter by read state for the authenticated recipient. Default ALL.',
  })
  @IsOptional()
  @IsEnum(NotificationReadState)
  readState: NotificationReadState = NotificationReadState.ALL;

  @ApiPropertyOptional({
    enum: ActivityEventType,
    description: 'Optional filter on the underlying ActivityEvent type.',
  })
  @IsOptional()
  @IsEnum(ActivityEventType)
  type?: ActivityEventType;
}
