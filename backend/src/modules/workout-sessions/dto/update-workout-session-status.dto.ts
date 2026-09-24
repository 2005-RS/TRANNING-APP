import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkoutSessionLifecycleStatus } from '../enums/workout-session-lifecycle-status.enum';

export class UpdateWorkoutSessionStatusDto {
  @ApiProperty({
    enum: WorkoutSessionLifecycleStatus,
    description:
      'IN_PROGRESS is assigned on start only. COMPLETED requires at least one recorded set. CANCELLED is allowed with zero sets. Terminal sessions are immutable.',
  })
  @IsEnum(WorkoutSessionLifecycleStatus)
  status!: WorkoutSessionLifecycleStatus;
}
