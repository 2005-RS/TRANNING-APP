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
  NutritionFoodSortField,
  SortDirection,
} from '../enums/nutrition-food-sort-field.enum';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';
import {
  NUTRITION_FOOD_LIST_DEFAULT_LIMIT,
  NUTRITION_FOOD_LIST_DEFAULT_PAGE,
  NUTRITION_FOOD_LIST_MAX_LIMIT,
  NUTRITION_FOOD_SEARCH_MAX_LENGTH,
} from '../nutrition-foods.constants';

export class ListNutritionFoodsQueryDto {
  @ApiPropertyOptional({
    default: NUTRITION_FOOD_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = NUTRITION_FOOD_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: NUTRITION_FOOD_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: NUTRITION_FOOD_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NUTRITION_FOOD_LIST_MAX_LIMIT)
  limit: number = NUTRITION_FOOD_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    maxLength: NUTRITION_FOOD_SEARCH_MAX_LENGTH,
    description: 'Case-insensitive ILIKE against name and brand.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_FOOD_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: NutritionFoodStatus,
    description:
      'Defaults to ACTIVE. ARCHIVED lists are scoped to ADMIN (all) or the creating TRAINER (own foods only).',
  })
  @IsOptional()
  @IsEnum(NutritionFoodStatus)
  status?: NutritionFoodStatus;

  @ApiPropertyOptional({
    enum: NutritionFoodSortField,
    default: NutritionFoodSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(NutritionFoodSortField)
  sort: NutritionFoodSortField = NutritionFoodSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
