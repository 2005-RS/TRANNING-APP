import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateNutritionPlanDto {
  @ApiPropertyOptional({
    example: 'Hypertrophy Nutrition',
    minLength: NUTRITION_PLAN_NAME_MIN_LENGTH,
    maxLength: NUTRITION_PLAN_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePlanName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_PLAN_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_PLAN_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: NUTRITION_PLAN_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NUTRITION_PLAN_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsStrictIsoDate()
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsStrictIsoDate()
  endDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
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
    nullable: true,
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
    nullable: true,
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
    nullable: true,
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
