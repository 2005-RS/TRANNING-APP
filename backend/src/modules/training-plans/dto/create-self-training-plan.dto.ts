import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TrainingPlanDayOfWeek } from '../enums/training-plan-day-of-week.enum';
import {
  SELF_TRAINING_PLAN_MAX_WORKOUTS,
  SELF_TRAINING_PLAN_MIN_WORKOUTS,
  TRAINING_PLAN_NAME_MAX_LENGTH,
} from '../training-plans.constants';

export class SelfTrainingPlanWorkoutInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  workoutTemplateId!: string;

  @ApiPropertyOptional({ enum: TrainingPlanDayOfWeek, nullable: true })
  @IsOptional()
  @IsEnum(TrainingPlanDayOfWeek)
  scheduledDay?: TrainingPlanDayOfWeek | null;
}

export class CreateSelfTrainingPlanDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: TRAINING_PLAN_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(TRAINING_PLAN_NAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ type: [SelfTrainingPlanWorkoutInputDto] })
  @IsArray()
  @ArrayMinSize(SELF_TRAINING_PLAN_MIN_WORKOUTS)
  @ArrayMaxSize(SELF_TRAINING_PLAN_MAX_WORKOUTS)
  @ArrayUnique(
    (item: SelfTrainingPlanWorkoutInputDto) => item.workoutTemplateId,
  )
  @ValidateNested({ each: true })
  @Type(() => SelfTrainingPlanWorkoutInputDto)
  workouts!: SelfTrainingPlanWorkoutInputDto[];
}
