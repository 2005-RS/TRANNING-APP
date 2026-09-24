import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkoutTemplateLifecycleStatus } from '../enums/workout-template-lifecycle-status.enum';

export class UpdateWorkoutTemplateStatusDto {
  @ApiProperty({
    enum: WorkoutTemplateLifecycleStatus,
    description:
      'DRAFT is assigned on create only. Use ACTIVE to activate or reactivate a usable template. Use ARCHIVED to retire it. This endpoint does not restore DRAFT.',
  })
  @IsEnum(WorkoutTemplateLifecycleStatus)
  status!: WorkoutTemplateLifecycleStatus;
}
