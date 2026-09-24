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
  NutritionPlanSortField,
  SortDirection,
} from '../enums/nutrition-plan-sort-field.enum';
import { NutritionPlanStatus } from '../enums/nutrition-plan-status.enum';
import {
  NUTRITION_PLAN_LIST_DEFAULT_LIMIT,
  NUTRITION_PLAN_LIST_DEFAULT_PAGE,
  NUTRITION_PLAN_LIST_MAX_LIMIT,
  NUTRITION_PLAN_SEARCH_MAX_LENGTH,
} from '../nutrition-plans.constants';

export class ListNutritionPlansQueryDto {
  @ApiPropertyOptional({
    default: NUTRITION_PLAN_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = NUTRITION_PLAN_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: NUTRITION_PLAN_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: NUTRITION_PLAN_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NUTRITION_PLAN_LIST_MAX_LIMIT)
  limit: number = NUTRITION_PLAN_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: NUTRITION_PLAN_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: NutritionPlanStatus })
  @IsOptional()
  @IsEnum(NutritionPlanStatus)
  status?: NutritionPlanStatus;

  @ApiPropertyOptional({
    enum: NutritionPlanSortField,
    default: NutritionPlanSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(NutritionPlanSortField)
  sort: NutritionPlanSortField = NutritionPlanSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
