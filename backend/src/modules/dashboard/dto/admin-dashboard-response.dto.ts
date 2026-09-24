import { ApiProperty } from '@nestjs/swagger';
import { DashboardNotificationsSummaryDto } from './client-dashboard-response.dto';

export class AdminDashboardResponseDto {
  @ApiProperty({ enum: [7, 30, 90] })
  periodDays!: number;

  @ApiProperty({
    description:
      'Users with role TRAINER, status ACTIVE, and a TrainerProfile.',
  })
  activeTrainers!: number;

  @ApiProperty({
    description: 'Users with role CLIENT, status ACTIVE, and a ClientProfile.',
  })
  activeClients!: number;

  @ApiProperty({
    description:
      'Distinct ACTIVE Clients with a current TrainerClientAssignment (endedAt IS NULL). Assignment history is excluded.',
  })
  currentlyAssignedClients!: number;

  @ApiProperty({
    description:
      'ACTIVE Clients with no current TrainerClientAssignment. The reason is not exposed.',
  })
  unassignedActiveClients!: number;

  @ApiProperty({
    description:
      'TrainingPlans with status ACTIVE. PostgreSQL enforces at most one ACTIVE plan per Client.',
  })
  activeTrainingPlans!: number;

  @ApiProperty({
    description:
      'NutritionPlans with status ACTIVE. PostgreSQL enforces at most one ACTIVE plan per Client.',
  })
  activeNutritionPlans!: number;

  @ApiProperty({
    description:
      'COMPLETED WorkoutSessions whose startedAt falls in the rolling periodDays window. No per-Client session details.',
  })
  completedWorkoutSessions!: number;

  @ApiProperty({
    description:
      'System-wide SUBMITTED CheckIns waiting for Trainer review. Content is omitted.',
  })
  pendingCheckIns!: number;

  @ApiProperty({
    type: DashboardNotificationsSummaryDto,
    description:
      'Unread count for the authenticated ADMIN user only. Not an aggregate of all admins.',
  })
  notifications!: DashboardNotificationsSummaryDto;
}
