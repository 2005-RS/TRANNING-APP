import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NutritionMealType } from '../enums/nutrition-meal-type.enum';
import {
  NUTRITION_PLAN_MAX_ITEMS_PER_MEAL,
  NUTRITION_PLAN_MAX_MEALS,
  NUTRITION_PLAN_MEAL_NAME_MAX_LENGTH,
  NUTRITION_PLAN_MEAL_NAME_MIN_LENGTH,
  NUTRITION_PLAN_NOTES_MAX_LENGTH,
  NUTRITION_PLAN_QUANTITY_MAX,
  NUTRITION_PLAN_QUANTITY_MIN,
} from '../nutrition-plans.constants';
import { normalizePlanName } from '../nutrition-plan-text.util';

export class NutritionPlanMealItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  foodId!: string;

  @ApiProperty({
    example: 150,
    description: 'Prescribed portion in grams. Canonical quantity unit.',
    minimum: NUTRITION_PLAN_QUANTITY_MIN,
    maximum: NUTRITION_PLAN_QUANTITY_MAX,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_QUANTITY_MIN)
  @Max(NUTRITION_PLAN_QUANTITY_MAX)
  quantityGrams!: number;

  @ApiPropertyOptional({
    maxLength: NUTRITION_PLAN_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class NutritionPlanMealInputDto {
  @ApiProperty({
    example: 'Breakfast',
    minLength: NUTRITION_PLAN_MEAL_NAME_MIN_LENGTH,
    maxLength: NUTRITION_PLAN_MEAL_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePlanName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_PLAN_MEAL_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_PLAN_MEAL_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ enum: NutritionMealType })
  @IsEnum(NutritionMealType)
  mealType!: NutritionMealType;

  @ApiPropertyOptional({
    maxLength: NUTRITION_PLAN_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_NOTES_MAX_LENGTH)
  notes?: string | null;

  @ApiProperty({
    type: [NutritionPlanMealItemInputDto],
    description:
      'A meal must contain at least one item. Empty meals are rejected.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(NUTRITION_PLAN_MAX_ITEMS_PER_MEAL)
  @ValidateNested({ each: true })
  @Type(() => NutritionPlanMealItemInputDto)
  items!: NutritionPlanMealItemInputDto[];
}

export class ReplaceNutritionPlanMealsDto {
  @ApiProperty({
    type: [NutritionPlanMealInputDto],
    description:
      'Atomically replaces the plan meal structure. Empty array is allowed only while DRAFT. Position is assigned from array order.',
  })
  @IsArray()
  @ArrayMaxSize(NUTRITION_PLAN_MAX_MEALS)
  @ValidateNested({ each: true })
  @Type(() => NutritionPlanMealInputDto)
  meals!: NutritionPlanMealInputDto[];
}
