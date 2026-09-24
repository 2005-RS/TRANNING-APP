import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import {
  ProgressExerciseSortField,
  SortDirection,
} from '../enums/progress-exercise-sort-field.enum';
import {
  PROGRESS_LIST_DEFAULT_LIMIT,
  PROGRESS_LIST_DEFAULT_PAGE,
  PROGRESS_LIST_MAX_LIMIT,
  PROGRESS_SEARCH_MAX_LENGTH,
} from '../progress.constants';

export class ProgressDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description:
      'Inclusive UTC calendar day lower bound on WorkoutSession.startedAt (YYYY-MM-DD). Matches Workout Session history filters. Only COMPLETED sessions are eligible.',
  })
  @IsOptional()
  @IsStrictIsoDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description:
      'Inclusive UTC calendar day upper bound on WorkoutSession.startedAt (YYYY-MM-DD). dateTo < dateFrom returns 400.',
  })
  @ValidateIf(
    (dto: ProgressDateRangeQueryDto) =>
      dto.dateTo !== undefined && dto.dateTo !== null,
  )
  @IsStrictIsoDate()
  dateTo?: string;
}

export class ProgressSummaryQueryDto extends ProgressDateRangeQueryDto {}

export class ListProgressExercisesQueryDto extends ProgressDateRangeQueryDto {
  @ApiPropertyOptional({
    default: PROGRESS_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PROGRESS_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PROGRESS_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PROGRESS_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROGRESS_LIST_MAX_LIMIT)
  limit?: number = PROGRESS_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    maxLength: PROGRESS_SEARCH_MAX_LENGTH,
    description:
      'Case-insensitive search of the current canonical Exercise.name. Historical snapshots are not searched. Wildcards are escaped.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROGRESS_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: ProgressExerciseSortField,
    default: ProgressExerciseSortField.LastPerformedAt,
  })
  @IsOptional()
  @IsEnum(ProgressExerciseSortField)
  sort?: ProgressExerciseSortField = ProgressExerciseSortField.LastPerformedAt;

  @ApiPropertyOptional({
    enum: SortDirection,
    default: SortDirection.Desc,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  direction?: SortDirection = SortDirection.Desc;

  @ApiPropertyOptional({
    enum: WorkoutPrescriptionType,
    description:
      'Optional filter. Rows are grouped by exerciseId + prescriptionType, so the same Exercise can appear twice if it was executed as both REPS and DURATION.',
  })
  @IsOptional()
  @IsEnum(WorkoutPrescriptionType)
  prescriptionType?: WorkoutPrescriptionType;
}

export class ExerciseProgressDetailQueryDto extends ProgressDateRangeQueryDto {
  @ApiPropertyOptional({
    default: PROGRESS_LIST_DEFAULT_PAGE,
    minimum: 1,
    description:
      'History/trend page. Paginated by completed WorkoutSession, not by individual sets.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PROGRESS_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PROGRESS_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PROGRESS_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROGRESS_LIST_MAX_LIMIT)
  limit?: number = PROGRESS_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    enum: WorkoutPrescriptionType,
    description:
      'Optional when only one historical type exists. If both REPS and DURATION history exist and this is omitted, both sections are returned. If specified and that type has no completed history, the response is 404.',
  })
  @IsOptional()
  @IsEnum(WorkoutPrescriptionType)
  prescriptionType?: WorkoutPrescriptionType;
}
