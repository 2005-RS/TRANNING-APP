import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardNotificationsSummaryDto } from './client-dashboard-response.dto';

export class TrainerDashboardClientRefDto {
  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty({
    description:
      'User.firstName + lastName. Email and auth fields are omitted.',
  })
  clientName!: string;
}

export class TrainerDashboardPendingCheckInItemDto {
  @ApiProperty()
  checkInId!: string;

  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({ example: '2026-08-24' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-30' })
  periodEnd!: string;

  @ApiProperty({ type: Date })
  submittedAt!: Date;
}

export class TrainerDashboardPendingCheckInsDto {
  @ApiProperty({
    description:
      'SUBMITTED CheckIns for currently assigned ACTIVE Clients. DRAFT and REVIEWED are excluded.',
  })
  count!: number;

  @ApiProperty({
    type: [TrainerDashboardPendingCheckInItemDto],
    description:
      'Oldest pending CheckIns first, max 5. Response text is omitted.',
  })
  items!: TrainerDashboardPendingCheckInItemDto[];
}

export class TrainerDashboardInactiveClientItemDto extends TrainerDashboardClientRefDto {
  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description:
      'completedAt of the most recent COMPLETED WorkoutSession, or null if none exist.',
  })
  lastCompletedWorkoutAt!: Date | null;
}

export class TrainerDashboardInactivityDto {
  @ApiProperty({ enum: [7, 14, 30] })
  inactivityDays!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty({
    type: [TrainerDashboardInactiveClientItemDto],
    description: 'Bounded list, max 10. Neutral operational list only.',
  })
  items!: TrainerDashboardInactiveClientItemDto[];
}

export class TrainerDashboardMissingPlanDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({
    type: [TrainerDashboardClientRefDto],
    description:
      'Bounded list, max 10. Status is explicit ACTIVE, not inferred from dates.',
  })
  items!: TrainerDashboardClientRefDto[];
}

export class TrainerDashboardRecentSessionDto {
  @ApiProperty()
  workoutSessionId!: string;

  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  workoutName!: string;

  @ApiProperty({ type: Date })
  completedAt!: Date;

  @ApiProperty()
  performedSetCount!: number;
}

export class TrainerDashboardResponseDto {
  @ApiProperty({
    description:
      'Currently assigned Clients whose User.status is ACTIVE. Historical assignments are excluded.',
  })
  activeClientCount!: number;

  @ApiProperty({
    description:
      'Currently assigned Clients whose User.status is DISABLED. Listed separately so disabled accounts are not treated as active workload.',
  })
  disabledAssignedClientCount!: number;

  @ApiProperty({ type: TrainerDashboardPendingCheckInsDto })
  pendingCheckIns!: TrainerDashboardPendingCheckInsDto;

  @ApiProperty({ type: TrainerDashboardInactivityDto })
  clientsWithoutRecentTraining!: TrainerDashboardInactivityDto;

  @ApiProperty({ type: TrainerDashboardMissingPlanDto })
  clientsWithoutActiveTrainingPlan!: TrainerDashboardMissingPlanDto;

  @ApiProperty({ type: TrainerDashboardMissingPlanDto })
  clientsWithoutActiveNutritionPlan!: TrainerDashboardMissingPlanDto;

  @ApiProperty({
    type: [TrainerDashboardRecentSessionDto],
    description:
      'Last 10 COMPLETED WorkoutSessions across currently assigned ACTIVE Clients. Actual sets are omitted.',
  })
  recentCompletedSessions!: TrainerDashboardRecentSessionDto[];

  @ApiProperty({ type: DashboardNotificationsSummaryDto })
  notifications!: DashboardNotificationsSummaryDto;
}
