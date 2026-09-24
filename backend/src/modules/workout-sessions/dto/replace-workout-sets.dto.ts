import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TRAINING_PLAN_TARGET_LOAD_MAX,
  TRAINING_PLAN_TARGET_LOAD_MIN,
} from '../../training-plans/training-plans.constants';
import {
  WORKOUT_TEMPLATE_RIR_MAX,
  WORKOUT_TEMPLATE_RIR_MIN,
  WORKOUT_TEMPLATE_RPE_MAX,
  WORKOUT_TEMPLATE_RPE_MIN,
} from '../../workout-templates/workout-templates.constants';
import {
  WORKOUT_SESSION_ACTUAL_DURATION_MAX,
  WORKOUT_SESSION_ACTUAL_DURATION_MIN,
  WORKOUT_SESSION_ACTUAL_REPS_MAX,
  WORKOUT_SESSION_ACTUAL_REPS_MIN,
  WORKOUT_SESSION_MAX_SETS,
  WORKOUT_SESSION_SET_NOTES_MAX_LENGTH,
} from '../workout-sessions.constants';

export class WorkoutSetInputDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Required for REPS exercises. Zero is a valid failed attempt.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_SESSION_ACTUAL_REPS_MIN)
  @Max(WORKOUT_SESSION_ACTUAL_REPS_MAX)
  actualReps?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Required for DURATION exercises.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_SESSION_ACTUAL_DURATION_MIN)
  @Max(WORKOUT_SESSION_ACTUAL_DURATION_MAX)
  actualDurationSeconds?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Canonical kilograms. Zero is valid for unloaded movements.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(TRAINING_PLAN_TARGET_LOAD_MIN)
  @Max(TRAINING_PLAN_TARGET_LOAD_MAX)
  actualLoadKg?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(WORKOUT_TEMPLATE_RPE_MIN)
  @Max(WORKOUT_TEMPLATE_RPE_MAX)
  actualRpe?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_RIR_MIN)
  @Max(WORKOUT_TEMPLATE_RIR_MAX)
  actualRir?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: WORKOUT_SESSION_SET_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_SESSION_SET_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class ReplaceWorkoutSetsDto {
  @ApiProperty({
    type: [WorkoutSetInputDto],
    description:
      'Ordered actual sets. Backend assigns setNumber from array order. Empty array clears recorded sets while IN_PROGRESS.',
  })
  @IsArray()
  @ArrayMaxSize(WORKOUT_SESSION_MAX_SETS)
  @ValidateNested({ each: true })
  @Type(() => WorkoutSetInputDto)
  sets!: WorkoutSetInputDto[];
}
