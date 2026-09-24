import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CheckInStatus } from '../../check-ins/enums/check-in-status.enum';
import { PaginationMetaDto } from '../../clients/dto/client-response.dto';
import {
  DASHBOARD_INACTIVITY_DAYS,
  TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT,
  TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE,
  TRAINER_CLIENT_OVERVIEW_MAX_LIMIT,
  TRAINER_CLIENT_OVERVIEW_SEARCH_MAX_LENGTH,
} from '../dashboard.constants';
import { ToOptionalBoolean } from './transform.util';

export class TrainerClientOverviewQueryDto {
  @ApiPropertyOptional({
    default: TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT,
    minimum: 1,
    maximum: TRAINER_CLIENT_OVERVIEW_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TRAINER_CLIENT_OVERVIEW_MAX_LIMIT)
  limit: number = TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    maxLength: TRAINER_CLIENT_OVERVIEW_SEARCH_MAX_LENGTH,
    description:
      'Case-insensitive search of Client User.firstName and lastName. Wildcards are escaped. Notes and email are not searched.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_CLIENT_OVERVIEW_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    description:
      'When true, only Clients with an ACTIVE TrainingPlan. When false, only Clients without one. Omitted: no filter.',
  })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  hasActiveTrainingPlan?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, only Clients with an ACTIVE NutritionPlan. When false, only Clients without one. Omitted: no filter.',
  })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  hasActiveNutritionPlan?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, only Clients with at least one SUBMITTED CheckIn. When false, only Clients with none. Omitted: no filter.',
  })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  hasPendingCheckIn?: boolean;

  @ApiPropertyOptional({
    enum: DASHBOARD_INACTIVITY_DAYS,
    description:
      'When set, only Clients with no COMPLETED WorkoutSession whose startedAt is within this many days (including never-completed). Allowed: 7, 14, 30.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(DASHBOARD_INACTIVITY_DAYS)
  inactivityDays?: number;
}

export class TrainerClientOverviewItemDto {
  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  hasActiveTrainingPlan!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  currentTrainingPlanName!: string | null;

  @ApiProperty()
  hasActiveNutritionPlan!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  currentNutritionPlanName!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  lastCompletedWorkoutAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, enum: CheckInStatus })
  latestCheckInStatus!: CheckInStatus | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2026-08-30' })
  latestCheckInPeriodEnd!: string | null;

  @ApiProperty()
  hasPendingCheckIn!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description:
      'measuredAt of the latest BodyMeasurement. Metric values are omitted from this list.',
  })
  latestBodyMeasurementAt!: Date | null;
}

export class TrainerClientOverviewResponseDto {
  @ApiProperty({ type: [TrainerClientOverviewItemDto] })
  data!: TrainerClientOverviewItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
