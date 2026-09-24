import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { normalizeTemplateName } from '../../workout-templates/workout-template-text.util';
import {
  TRAINING_PLAN_DESCRIPTION_MAX_LENGTH,
  TRAINING_PLAN_NAME_MAX_LENGTH,
  TRAINING_PLAN_NAME_MIN_LENGTH,
} from '../training-plans.constants';

export class UpdateTrainingPlanDto {
  @ApiPropertyOptional({
    example: 'Hypertrophy Phase 1',
    minLength: TRAINING_PLAN_NAME_MIN_LENGTH,
    maxLength: TRAINING_PLAN_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeTemplateName(value) : value,
  )
  @IsString()
  @MinLength(TRAINING_PLAN_NAME_MIN_LENGTH)
  @MaxLength(TRAINING_PLAN_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: TRAINING_PLAN_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINING_PLAN_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({ example: '2026-09-07', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsStrictIsoDate()
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsStrictIsoDate()
  endDate?: string | null;
}
