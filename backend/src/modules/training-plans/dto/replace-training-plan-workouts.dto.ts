import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TrainingPlanDayOfWeek } from '../enums/training-plan-day-of-week.enum';
import {
  TRAINING_PLAN_MAX_WORKOUTS,
  TRAINING_PLAN_NOTES_MAX_LENGTH,
} from '../training-plans.constants';

export class TrainingPlanWorkoutInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  workoutTemplateId!: string;

  @ApiPropertyOptional({
    enum: TrainingPlanDayOfWeek,
    nullable: true,
    description:
      'Optional weekday. Null means the workout is in the plan but not bound to a day. Multiple workouts may share a day.',
  })
  @IsOptional()
  @IsEnum(TrainingPlanDayOfWeek)
  scheduledDay?: TrainingPlanDayOfWeek | null;

  @ApiPropertyOptional({
    maxLength: TRAINING_PLAN_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINING_PLAN_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class ReplaceTrainingPlanWorkoutsDto {
  @ApiProperty({ type: [TrainingPlanWorkoutInputDto] })
  @IsArray()
  @ArrayMaxSize(TRAINING_PLAN_MAX_WORKOUTS)
  @ValidateNested({ each: true })
  @Type(() => TrainingPlanWorkoutInputDto)
  workouts!: TrainingPlanWorkoutInputDto[];
}
