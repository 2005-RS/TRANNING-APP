import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TrainingPlanLifecycleStatus } from '../enums/training-plan-lifecycle-status.enum';

export class UpdateTrainingPlanStatusDto {
  @ApiProperty({
    enum: TrainingPlanLifecycleStatus,
    description:
      "DRAFT is assigned on create only. ACTIVE makes this the client's current plan and archives any previous ACTIVE plan. ARCHIVED retires it. This endpoint does not restore DRAFT.",
  })
  @IsEnum(TrainingPlanLifecycleStatus)
  status!: TrainingPlanLifecycleStatus;
}
