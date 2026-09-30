import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NUTRITION_FOOD_PORTION_GRAMS_MAX,
  NUTRITION_FOOD_PORTION_GRAMS_MIN,
  NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH,
} from '../nutrition-foods.constants';

export class FoodPortionInputDto {
  @ApiProperty({
    example: '1 egg',
    maxLength: NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH)
  label!: string;

  @ApiProperty({
    example: 50,
    minimum: NUTRITION_FOOD_PORTION_GRAMS_MIN,
    maximum: NUTRITION_FOOD_PORTION_GRAMS_MAX,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(NUTRITION_FOOD_PORTION_GRAMS_MIN)
  @Max(NUTRITION_FOOD_PORTION_GRAMS_MAX)
  gramWeight!: number;

  @ApiPropertyOptional({
    description:
      'At most one portion may be the default. Defaults to the first portion.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
