import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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
} from '../nutrition-foods.constants';
import {
  normalizeFoodName,
  optionalPlainText,
} from '../nutrition-food-text.util';
import { ToNullableNumber } from '../transform.util';

export class CreateNutritionFoodDto {
  @ApiProperty({
    example: 'Chicken Breast',
    minLength: NUTRITION_FOOD_NAME_MIN_LENGTH,
    maxLength: NUTRITION_FOOD_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeFoodName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_FOOD_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_FOOD_NAME_MAX_LENGTH)
  name!: string;

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

  @ApiProperty({
    example: 165,
    description: 'Kilocalories per 100 grams. Canonical nutritional basis.',
    minimum: NUTRITION_FOOD_CALORIES_MIN,
    maximum: NUTRITION_FOOD_CALORIES_MAX,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_CALORIES_MIN)
  @Max(NUTRITION_FOOD_CALORIES_MAX)
  caloriesPer100g!: number;

  @ApiProperty({
    example: 31,
    description: 'Protein grams per 100 grams. Not required to match 4 kcal/g.',
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  proteinGPer100g!: number;

  @ApiProperty({
    example: 0,
    description: 'Carbohydrate grams per 100 grams.',
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  carbohydratesGPer100g!: number;

  @ApiProperty({
    example: 3.6,
    description: 'Fat grams per 100 grams. Not required to match 9 kcal/g.',
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  fatGPer100g!: number;

  @ApiPropertyOptional({
    example: 0,
    nullable: true,
    description:
      'Fiber grams per 100 grams. Optional; not deducted from carbs.',
    minimum: NUTRITION_FOOD_MACRO_MIN,
    maximum: NUTRITION_FOOD_MACRO_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_FOOD_MACRO_MIN)
  @Max(NUTRITION_FOOD_MACRO_MAX)
  fiberGPer100g?: number | null;
}
