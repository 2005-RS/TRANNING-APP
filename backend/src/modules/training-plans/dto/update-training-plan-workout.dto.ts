import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrainingPlanDayOfWeek } from '../enums/training-plan-day-of-week.enum';
import { TRAINING_PLAN_NOTES_MAX_LENGTH } from '../training-plans.constants';

export class UpdateTrainingPlanWorkoutDto {
  @ApiPropertyOptional({
    enum: TrainingPlanDayOfWeek,
    nullable: true,
    description:
      'Plan-owned schedule metadata. Changing a day does not resnapshot the source template.',
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
