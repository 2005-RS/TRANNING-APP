import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  NUTRITION_FOOD_BRAND_MAX_LENGTH,
  NUTRITION_FOOD_CALORIES_MAX,
  NUTRITION_FOOD_CALORIES_MIN,
  NUTRITION_FOOD_DESCRIPTION_MAX_LENGTH,
  NUTRITION_FOOD_MACRO_MAX,
  NUTRITION_FOOD_MACRO_MIN,
  NUTRITION_FOOD_NAME_MAX_LENGTH,
  NUTRITION_FOOD_NAME_MIN_LENGTH,
  NUTRITION_FOOD_NUTRIENTS_MAX_ITEMS,
  NUTRITION_FOOD_PORTIONS_MAX_ITEMS,
} from '../nutrition-foods.constants';
import { FoodPortionInputDto } from './food-portion-input.dto';
import {
  normalizeFoodName,
  optionalPlainText,
} from '../nutrition-food-text.util';
import { ToNullableNumber } from '../transform.util';
import { NutritionFoodNutrientInputDto } from './nutrition-food-nutrient-input.dto';

export class UpdateNutritionFoodDto {
  @ApiPropertyOptional({
    example: 'Chicken Breast',
    minLength: NUTRITION_FOOD_NAME_MIN_LENGTH,
    maxLength: NUTRITION_FOOD_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeFoodName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_FOOD_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_FOOD_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: NUTRITION_FOOD_BRAND_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? optionalPlainText(value) : value,
  )
  @IsString()
  @MaxLength(NUTRITION_FOOD_BRAND_MAX_LENGTH)
  brand?: string | null;

  @ApiPropertyOptional({
    maxLength: NUTRITION_FOOD_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_FOOD_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    minimum: NUTRITION_FOOD_CALORIES_MIN,
    maximum: NUTRITION_FOOD_CALORIES_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_CALORIES_MIN)
  @Max(NUTRITION_FOOD_CALORIES_MAX)
  caloriesPer100g?: number;

  @ApiPropertyOptional({
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  proteinGPer100g?: number;

  @ApiPropertyOptional({
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  carbohydratesGPer100g?: number;

  @ApiPropertyOptional({
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  fatGPer100g?: number;

  @ApiPropertyOptional({
    nullable: true,
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  fiberGPer100g?: number | null;

  @ApiPropertyOptional({
    type: [NutritionFoodNutrientInputDto],
    description:
      'Replacement set of non-core nutrient values per 100 grams. Omit to leave the set unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(NUTRITION_FOOD_NUTRIENTS_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => NutritionFoodNutrientInputDto)
  nutrients?: NutritionFoodNutrientInputDto[];

  @ApiPropertyOptional({
    type: [FoodPortionInputDto],
    description:
      'Replacement set of household measures. Omit to leave the portions unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(NUTRITION_FOOD_PORTIONS_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => FoodPortionInputDto)
  portions?: FoodPortionInputDto[];
}
