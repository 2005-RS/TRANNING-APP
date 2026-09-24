import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { WorkoutSessionStatus } from '../enums/workout-session-status.enum';
import {
  WORKOUT_SESSION_LIST_DEFAULT_LIMIT,
  WORKOUT_SESSION_LIST_DEFAULT_PAGE,
  WORKOUT_SESSION_LIST_MAX_LIMIT,
} from '../workout-sessions.constants';

export class ListWorkoutSessionsQueryDto {
  @ApiPropertyOptional({
    default: WORKOUT_SESSION_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = WORKOUT_SESSION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: WORKOUT_SESSION_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: WORKOUT_SESSION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(WORKOUT_SESSION_LIST_MAX_LIMIT)
  limit: number = WORKOUT_SESSION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: WorkoutSessionStatus })
  @IsOptional()
  @IsEnum(WorkoutSessionStatus)
  status?: WorkoutSessionStatus;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description:
      'Inclusive UTC calendar day lower bound on startedAt (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsStrictIsoDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description:
      'Inclusive UTC calendar day upper bound on startedAt (YYYY-MM-DD).',
  })
  @ValidateIf(
    (dto: ListWorkoutSessionsQueryDto) =>
      dto.dateTo !== undefined && dto.dateTo !== null,
  )
  @IsStrictIsoDate()
  dateTo?: string;
}
