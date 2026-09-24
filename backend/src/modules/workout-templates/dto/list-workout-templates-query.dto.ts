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
  WorkoutTemplateSortField,
} from '../enums/workout-template-sort-field.enum';
import { WorkoutTemplateStatus } from '../enums/workout-template-status.enum';
import {
  WORKOUT_TEMPLATE_LIST_DEFAULT_LIMIT,
  WORKOUT_TEMPLATE_LIST_DEFAULT_PAGE,
  WORKOUT_TEMPLATE_LIST_MAX_LIMIT,
  WORKOUT_TEMPLATE_SEARCH_MAX_LENGTH,
} from '../workout-templates.constants';

export class ListWorkoutTemplatesQueryDto {
  @ApiPropertyOptional({
    default: WORKOUT_TEMPLATE_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = WORKOUT_TEMPLATE_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: WORKOUT_TEMPLATE_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: WORKOUT_TEMPLATE_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(WORKOUT_TEMPLATE_LIST_MAX_LIMIT)
  limit: number = WORKOUT_TEMPLATE_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: WORKOUT_TEMPLATE_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: WorkoutTemplateStatus,
    description:
      'Defaults to ACTIVE (shared catalog). TRAINER listing DRAFT or ARCHIVED is scoped to templates they created. ADMIN may list all rows for the requested status.',
  })
  @IsOptional()
  @IsEnum(WorkoutTemplateStatus)
  status?: WorkoutTemplateStatus;

  @ApiPropertyOptional({
    enum: WorkoutTemplateSortField,
    default: WorkoutTemplateSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(WorkoutTemplateSortField)
  sort: WorkoutTemplateSortField = WorkoutTemplateSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
