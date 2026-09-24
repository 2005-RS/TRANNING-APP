import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityEventEntityType } from '../../activity-events/enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../../activity-events/enums/activity-event-type.enum';

export class NotificationRelatedEntityDto {
  @ApiProperty({ enum: ActivityEventEntityType })
  type!: ActivityEventEntityType;

  @ApiProperty()
  id!: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ActivityEventType })
  type!: ActivityEventType;

  @ApiPropertyOptional({ nullable: true, type: String })
  clientProfileId!: string | null;

  @ApiProperty({ type: NotificationRelatedEntityDto })
  relatedEntity!: NotificationRelatedEntityDto;

  @ApiPropertyOptional({ nullable: true, type: Date })
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 4 })
  unreadCount!: number;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ example: 5 })
  updatedCount!: number;
}
