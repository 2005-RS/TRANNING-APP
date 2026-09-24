import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import {
  NUTRITION_PLAN_DESCRIPTION_MAX_LENGTH,
  NUTRITION_PLAN_NAME_MAX_LENGTH,
  NUTRITION_PLAN_NAME_MIN_LENGTH,
  NUTRITION_PLAN_TARGET_CALORIES_MAX,
  NUTRITION_PLAN_TARGET_CALORIES_MIN,
  NUTRITION_PLAN_TARGET_MACRO_MAX,
  NUTRITION_PLAN_TARGET_MACRO_MIN,
} from '../nutrition-plans.constants';
import { normalizePlanName } from '../nutrition-plan-text.util';
import { ToNullableNumber } from '../transform.util';

export class CreateNutritionPlanDto {
  @ApiProperty({
    example: 'Hypertrophy Nutrition',
    minLength: NUTRITION_PLAN_NAME_MIN_LENGTH,
    maxLength: NUTRITION_PLAN_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePlanName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_PLAN_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_PLAN_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ maxLength: NUTRITION_PLAN_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsStrictIsoDate()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @ValidateIf(
    (dto: CreateNutritionPlanDto) =>
      dto.endDate !== undefined && dto.endDate !== null,
  )
  @IsStrictIsoDate()
  endDate?: string;

  @ApiPropertyOptional({
    example: 2700,
    description: 'Prescribed daily calorie target. Independent of meal totals.',
    minimum: NUTRITION_PLAN_TARGET_CALORIES_MIN,
    maximum: NUTRITION_PLAN_TARGET_CALORIES_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_TARGET_CALORIES_MIN)
  @Max(NUTRITION_PLAN_TARGET_CALORIES_MAX)
  targetCaloriesKcal?: number | null;

  @ApiPropertyOptional({
    example: 180,
    minimum: NUTRITION_PLAN_TARGET_MACRO_MIN,
    maximum: NUTRITION_PLAN_TARGET_MACRO_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_TARGET_MACRO_MIN)
  @Max(NUTRITION_PLAN_TARGET_MACRO_MAX)
  targetProteinG?: number | null;

  @ApiPropertyOptional({
    example: 330,
    minimum: NUTRITION_PLAN_TARGET_MACRO_MIN,
    maximum: NUTRITION_PLAN_TARGET_MACRO_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_TARGET_MACRO_MIN)
  @Max(NUTRITION_PLAN_TARGET_MACRO_MAX)
  targetCarbohydratesG?: number | null;

  @ApiPropertyOptional({
    example: 70,
    minimum: NUTRITION_PLAN_TARGET_MACRO_MIN,
    maximum: NUTRITION_PLAN_TARGET_MACRO_MAX,
  })
  @IsOptional()
  @ToNullableNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(NUTRITION_PLAN_TARGET_MACRO_MIN)
  @Max(NUTRITION_PLAN_TARGET_MACRO_MAX)
  targetFatG?: number | null;
}
