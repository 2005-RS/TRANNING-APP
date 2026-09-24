import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NUTRITION_PLAN_NOTES_MAX_LENGTH,
  NUTRITION_PLAN_QUANTITY_MAX,
  NUTRITION_PLAN_QUANTITY_MIN,
} from '../nutrition-plans.constants';

export class UpdateNutritionPlanMealItemDto {
  @ApiPropertyOptional({
    example: 180,
    description:
      'Adjust prescribed grams without rebuilding meals. Food identity and snapshot macros cannot change here.',
    minimum: NUTRITION_PLAN_QUANTITY_MIN,
    maximum: NUTRITION_PLAN_QUANTITY_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_QUANTITY_MIN)
  @Max(NUTRITION_PLAN_QUANTITY_MAX)
  quantityGrams?: number;

  @ApiPropertyOptional({
    maxLength: NUTRITION_PLAN_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_NOTES_MAX_LENGTH)
  notes?: string | null;
}
