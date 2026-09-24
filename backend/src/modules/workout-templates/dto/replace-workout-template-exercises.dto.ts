import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { WorkoutPrescriptionType } from '../enums/workout-prescription-type.enum';
import {
  WORKOUT_TEMPLATE_DURATION_MAX,
  WORKOUT_TEMPLATE_DURATION_MIN,
  WORKOUT_TEMPLATE_MAX_ITEMS,
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
} from '../workout-templates.constants';

export class WorkoutTemplateExerciseInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  exerciseId!: string;

  @ApiProperty({
    minimum: WORKOUT_TEMPLATE_SETS_MIN,
    maximum: WORKOUT_TEMPLATE_SETS_MAX,
  })
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_SETS_MIN)
  @Max(WORKOUT_TEMPLATE_SETS_MAX)
  sets!: number;

  @ApiProperty({ enum: WorkoutPrescriptionType })
  @IsEnum(WorkoutPrescriptionType)
  prescriptionType!: WorkoutPrescriptionType;

  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_REPS_MIN,
    maximum: WORKOUT_TEMPLATE_REPS_MAX,
    description: 'Required for REPS. Must be omitted or null for DURATION.',
  })
  @ValidateIf(
    (item: WorkoutTemplateExerciseInputDto) =>
      item.prescriptionType === WorkoutPrescriptionType.REPS,
  )
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REPS_MIN)
  @Max(WORKOUT_TEMPLATE_REPS_MAX)
  repsMin?: number | null;

  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_REPS_MIN,
    maximum: WORKOUT_TEMPLATE_REPS_MAX,
    description: 'Required for REPS. Must be >= repsMin.',
  })
  @ValidateIf(
    (item: WorkoutTemplateExerciseInputDto) =>
      item.prescriptionType === WorkoutPrescriptionType.REPS,
  )
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REPS_MIN)
  @Max(WORKOUT_TEMPLATE_REPS_MAX)
  repsMax?: number | null;

  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_DURATION_MIN,
    maximum: WORKOUT_TEMPLATE_DURATION_MAX,
    description: 'Required for DURATION. Must be omitted or null for REPS.',
  })
  @ValidateIf(
    (item: WorkoutTemplateExerciseInputDto) =>
      item.prescriptionType === WorkoutPrescriptionType.DURATION,
  )
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_DURATION_MIN)
  @Max(WORKOUT_TEMPLATE_DURATION_MAX)
  durationSeconds?: number | null;

  @ApiProperty({
    minimum: WORKOUT_TEMPLATE_REST_MIN,
    maximum: WORKOUT_TEMPLATE_REST_MAX,
    description: 'Rest in seconds. Zero means no rest.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_REST_MIN)
  @Max(WORKOUT_TEMPLATE_REST_MAX)
  restSeconds!: number;

  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_RPE_MIN,
    maximum: WORKOUT_TEMPLATE_RPE_MAX,
    nullable: true,
    description:
      'Optional intensity 1.0–10.0 with one decimal. Mutually exclusive with targetRir.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(WORKOUT_TEMPLATE_RPE_MIN)
  @Max(WORKOUT_TEMPLATE_RPE_MAX)
  targetRpe?: number | null;

  @ApiPropertyOptional({
    minimum: WORKOUT_TEMPLATE_RIR_MIN,
    maximum: WORKOUT_TEMPLATE_RIR_MAX,
    nullable: true,
    description: 'Optional integer 0–10. Mutually exclusive with targetRpe.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(WORKOUT_TEMPLATE_RIR_MIN)
  @Max(WORKOUT_TEMPLATE_RIR_MAX)
  targetRir?: number | null;

  @ApiPropertyOptional({
    maxLength: WORKOUT_TEMPLATE_TEMPO_MAX_LENGTH,
    example: '3-1-1-0',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_TEMPO_MAX_LENGTH)
  tempo?: string | null;

  @ApiPropertyOptional({
    maxLength: WORKOUT_TEMPLATE_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class ReplaceWorkoutTemplateExercisesDto {
  @ApiProperty({ type: [WorkoutTemplateExerciseInputDto] })
  @IsArray()
  @ArrayMaxSize(WORKOUT_TEMPLATE_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => WorkoutTemplateExerciseInputDto)
  items!: WorkoutTemplateExerciseInputDto[];
}
