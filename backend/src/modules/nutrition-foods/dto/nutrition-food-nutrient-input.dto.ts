import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Matches, Min, ValidateIf } from 'class-validator';
import { NUTRITION_FOOD_NUTRIENT_AMOUNT_MIN } from '../nutrition-foods.constants';
import { ToNullableNumber } from '../transform.util';

export class NutritionFoodNutrientInputDto {
  @ApiProperty({ example: 'sodium_mg' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  code!: string;

  @ApiProperty({ example: 74, nullable: true, type: Number })
  @ToNullableNumber()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(NUTRITION_FOOD_NUTRIENT_AMOUNT_MIN)
  amountPer100g!: number | null;
}
