import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import {
  WORKOUT_TEMPLATE_DURATION_MAX,
  WORKOUT_TEMPLATE_DURATION_MIN,
  WORKOUT_TEMPLATE_NOTES_MAX_LENGTH,
  WORKOUT_TEMPLATE_REPS_MAX,
  WORKOUT_TEMPLATE_REPS_MIN,
  WORKOUT_TEMPLATE_REST_MAX,
  WORKOUT_TEMPLATE_REST_MIN,
  WORKOUT_TEMPLATE_RIR_MAX,
  WORKOUT_TEMPLATE_RIR_MIN,
  WORKOUT_TEMPLATE_RPE_MAX,
  WORKOUT_TEMPLATE_RPE_MIN,
  WORKOUT_TEMPLATE_SETS_MAX,
  WORKOUT_TEMPLATE_SETS_MIN,
  WORKOUT_TEMPLATE_TEMPO_MAX_LENGTH,
} from '../../workout-templates/workout-templates.constants';
import {
  TRAINING_PLAN_TARGET_LOAD_MAX,
  TRAINING_PLAN_TARGET_LOAD_MIN,
} from '../training-plans.constants';

export class UpdateTrainingPlanExerciseDto {
  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_SETS_MIN,
    maximum: WORKOUT_TEMPLATE_SETS_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_SETS_MIN)
  @Max(WORKOUT_TEMPLATE_SETS_MAX)
  sets?: number;

  @ApiPropertyOptional({ enum: WorkoutPrescriptionType })
  @IsOptional()
  @IsEnum(WorkoutPrescriptionType)
  prescriptionType?: WorkoutPrescriptionType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REPS_MIN)
  @Max(WORKOUT_TEMPLATE_REPS_MAX)
  repsMin?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REPS_MIN)
  @Max(WORKOUT_TEMPLATE_REPS_MAX)
  repsMax?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_DURATION_MIN)
  @Max(WORKOUT_TEMPLATE_DURATION_MAX)
  durationSeconds?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REST_MIN)
  @Max(WORKOUT_TEMPLATE_REST_MAX)
  restSeconds?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Canonical kilograms. Zero is valid for unloaded movements.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(TRAINING_PLAN_TARGET_LOAD_MIN)
  @Max(TRAINING_PLAN_TARGET_LOAD_MAX)
  targetLoadKg?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(WORKOUT_TEMPLATE_RPE_MIN)
  @Max(WORKOUT_TEMPLATE_RPE_MAX)
  targetRpe?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_RIR_MIN)
  @Max(WORKOUT_TEMPLATE_RIR_MAX)
  targetRir?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_TEMPO_MAX_LENGTH)
  tempo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_NOTES_MAX_LENGTH)
  notes?: string | null;
}
