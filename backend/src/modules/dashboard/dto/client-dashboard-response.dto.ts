import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInStatus } from '../../check-ins/enums/check-in-status.enum';

export class DashboardNutritionTotalsDto {
  @ApiProperty({ example: 247.5 })
  caloriesKcal!: number;

  @ApiProperty({ example: 46.5 })
  proteinG!: number;

  @ApiProperty({ example: 0 })
  carbohydratesG!: number;

  @ApiProperty({ example: 5.4 })
  fatG!: number;

  @ApiProperty({ example: 0 })
  fiberG!: number;
}

export class ClientDashboardTrainingPlanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2026-09-01' })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2026-11-01' })
  endDate!: string | null;

  @ApiProperty({
    description:
      'COUNT of TrainingPlanWorkout rows. The full workout/exercise graph is omitted; use the Training Plan detail endpoint.',
  })
  workoutCount!: number;
}

export class ClientDashboardNutritionPlanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  endDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetCaloriesKcal!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetProteinG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetCarbohydratesG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetFatG!: number | null;

  @ApiProperty({ type: DashboardNutritionTotalsDto })
  mealPlanTotals!: DashboardNutritionTotalsDto;

  @ApiProperty({
    description:
      'COUNT of NutritionPlanMeal rows. Food items are omitted; use the Nutrition Plan detail endpoint.',
  })
  mealCount!: number;
}

export class ClientDashboardCurrentWorkoutSessionDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  workoutName!: string;

  @ApiProperty({ type: Date })
  startedAt!: Date;

  @ApiProperty()
  exerciseCount!: number;

  @ApiProperty({
    description:
      'COUNT of recorded WorkoutSet rows on this IN_PROGRESS session.',
  })
  recordedSetCount!: number;
}

export class ClientDashboardCompletedSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workoutName!: string;

  @ApiProperty({ type: Date })
  startedAt!: Date;

  @ApiProperty({ type: Date })
  completedAt!: Date;

  @ApiProperty()
  performedSetCount!: number;
}

export class ClientDashboardRecentTrainingDto {
  @ApiProperty({ type: [ClientDashboardCompletedSessionDto] })
  completedSessions!: ClientDashboardCompletedSessionDto[];
}

export class ClientDashboardPerformanceDto {
  @ApiProperty({
    description:
      'Distinct COMPLETED WorkoutSessions with at least one actual WorkoutSet whose startedAt falls in the rolling periodDays window. Same semantics as Progress summary.',
  })
  completedSessions!: number;

  @ApiProperty()
  performedSets!: number;

  @ApiProperty()
  totalReps!: number;

  @ApiProperty({
    description:
      'SUM(actualLoadKg * actualReps) when both values are NOT NULL. Null load does not assume bodyweight.',
  })
  externalLoadVolumeKg!: number;

  @ApiProperty()
  totalDurationSeconds!: number;

  @ApiProperty()
  exercisesPerformed!: number;
}

export class ClientDashboardBodyProgressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: Date })
  measuredAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bodyWeightKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bodyFatPercentage!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  waistCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  previousBodyWeightKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'latest bodyWeightKg − previous bodyWeightKg when both exist. Sign is factual; not a health judgment.',
  })
  bodyWeightChangeKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  previousWaistCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  waistChangeCm!: number | null;

  @ApiProperty({
    description:
      'COUNT of READY ProgressPhoto rows. Signed URLs are never issued from the dashboard.',
  })
  progressPhotoCount!: number;

  @ApiPropertyOptional({ nullable: true, type: Date })
  latestProgressPhotoCapturedAt!: Date | null;
}

export class ClientDashboardCheckInDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '2026-08-24' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-30' })
  periodEnd!: string;

  @ApiProperty({ enum: CheckInStatus })
  status!: CheckInStatus;

  @ApiPropertyOptional({ nullable: true, type: Date })
  submittedAt!: Date | null;

  @ApiProperty({
    description: 'true only when status is REVIEWED and a review row exists.',
  })
  hasReview!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description:
      'Review createdAt when hasReview is true. Feedback text is omitted.',
  })
  reviewedAt!: Date | null;
}

export class DashboardNotificationsSummaryDto {
  @ApiProperty({
    description:
      'Unread Notification rows for the authenticated user only. GET dashboard does not mark them read.',
  })
  unreadCount!: number;
}

export class ClientDashboardResponseDto {
  @ApiProperty({ enum: [7, 30, 90] })
  periodDays!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: ClientDashboardTrainingPlanDto,
    description: 'Current ACTIVE TrainingPlan summary, or null.',
  })
  trainingPlan!: ClientDashboardTrainingPlanDto | null;

  @ApiPropertyOptional({
    nullable: true,
    type: ClientDashboardNutritionPlanDto,
    description: 'Current ACTIVE NutritionPlan summary, or null.',
  })
  nutritionPlan!: ClientDashboardNutritionPlanDto | null;

  @ApiPropertyOptional({
    nullable: true,
    type: ClientDashboardCurrentWorkoutSessionDto,
    description: 'IN_PROGRESS WorkoutSession summary for resume, or null.',
  })
  currentWorkoutSession!: ClientDashboardCurrentWorkoutSessionDto | null;

  @ApiProperty({ type: ClientDashboardRecentTrainingDto })
  recentTraining!: ClientDashboardRecentTrainingDto;

  @ApiProperty({ type: ClientDashboardPerformanceDto })
  performance!: ClientDashboardPerformanceDto;

  @ApiPropertyOptional({
    nullable: true,
    type: ClientDashboardBodyProgressDto,
    description:
      'Latest BodyMeasurement plus previous comparable weight/waist when both values exist. Null when the Client has no measurements.',
  })
  bodyProgress!: ClientDashboardBodyProgressDto | null;

  @ApiPropertyOptional({
    nullable: true,
    type: ClientDashboardCheckInDto,
    description:
      'Latest CheckIn by periodStart DESC, createdAt DESC. DRAFT status is visible to the owning Client; DRAFT content is omitted.',
  })
  checkIn!: ClientDashboardCheckInDto | null;

  @ApiProperty({ type: DashboardNotificationsSummaryDto })
  notifications!: DashboardNotificationsSummaryDto;
}
