import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import {
  DASHBOARD_DEFAULT_INACTIVITY_DAYS,
  DASHBOARD_DEFAULT_PERIOD_DAYS,
  DASHBOARD_INACTIVITY_DAYS,
  DASHBOARD_PERIOD_DAYS,
} from '../dashboard.constants';

export class DashboardPeriodQueryDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_PERIOD_DAYS,
    default: DASHBOARD_DEFAULT_PERIOD_DAYS,
    description:
      'Rolling window in days ending at request time. WorkoutSession.startedAt is the timestamp. Only COMPLETED sessions are counted for training metrics. Allowed values: 7, 30, 90. Default 30. Arbitrary large windows are rejected.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(DASHBOARD_PERIOD_DAYS)
  periodDays: number = DASHBOARD_DEFAULT_PERIOD_DAYS;
}

export class DashboardInactivityQueryDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_INACTIVITY_DAYS,
    default: DASHBOARD_DEFAULT_INACTIVITY_DAYS,
    description:
      'A currently assigned ACTIVE Client is listed when they have no COMPLETED WorkoutSession with startedAt >= now − inactivityDays, including Clients who have never completed a session. Allowed values: 7, 14, 30. Default 7. Neutral operational metric only.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(DASHBOARD_INACTIVITY_DAYS)
  inactivityDays: number = DASHBOARD_DEFAULT_INACTIVITY_DAYS;
}

export class ClientDashboardQueryDto extends DashboardPeriodQueryDto {}

export class TrainerDashboardQueryDto extends DashboardInactivityQueryDto {}

export class AdminDashboardQueryDto extends DashboardPeriodQueryDto {}
