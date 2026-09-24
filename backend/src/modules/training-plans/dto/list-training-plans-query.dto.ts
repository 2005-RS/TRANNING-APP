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
} from 'class-validator';
import {
  SortDirection,
  TrainingPlanSortField,
} from '../enums/training-plan-sort-field.enum';
import { TrainingPlanStatus } from '../enums/training-plan-status.enum';
import {
  TRAINING_PLAN_LIST_DEFAULT_LIMIT,
  TRAINING_PLAN_LIST_DEFAULT_PAGE,
  TRAINING_PLAN_LIST_MAX_LIMIT,
  TRAINING_PLAN_SEARCH_MAX_LENGTH,
} from '../training-plans.constants';

export class ListTrainingPlansQueryDto {
  @ApiPropertyOptional({
    default: TRAINING_PLAN_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = TRAINING_PLAN_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: TRAINING_PLAN_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: TRAINING_PLAN_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TRAINING_PLAN_LIST_MAX_LIMIT)
  limit: number = TRAINING_PLAN_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: TRAINING_PLAN_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINING_PLAN_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: TrainingPlanStatus })
  @IsOptional()
  @IsEnum(TrainingPlanStatus)
  status?: TrainingPlanStatus;

  @ApiPropertyOptional({
    enum: TrainingPlanSortField,
    default: TrainingPlanSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(TrainingPlanSortField)
  sort: TrainingPlanSortField = TrainingPlanSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
