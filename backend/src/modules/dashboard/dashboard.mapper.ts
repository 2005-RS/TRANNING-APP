import { CheckInStatus } from '../check-ins/enums/check-in-status.enum';
import { toIsoDateString } from '../clients/iso-date.util';
import {
  clientDisplayName,
  metricDelta,
  toCount,
  toMetricNumber,
  toNullableMetricNumber,
} from './dashboard-metrics.util';
import {
  AdminCountsRow,
  AssignedClientCountRow,
  BodyMeasurementRow,
  CheckInSummaryRow,
  CurrentSessionRow,
  InactiveClientRow,
  MissingPlanClientRow,
  NutritionPlanSummaryRow,
  OverviewRow,
  PendingCheckInRow,
  PerformanceRow,
  ProgressPhotoSummaryRow,
  RecentSessionRow,
  TrainerRecentSessionRow,
  TrainingPlanSummaryRow,
} from './dashboard-sql';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';
import {
  ClientDashboardBodyProgressDto,
  ClientDashboardCheckInDto,
  ClientDashboardCompletedSessionDto,
  ClientDashboardCurrentWorkoutSessionDto,
  ClientDashboardNutritionPlanDto,
  ClientDashboardPerformanceDto,
  ClientDashboardResponseDto,
  ClientDashboardTrainingPlanDto,
  DashboardNotificationsSummaryDto,
} from './dto/client-dashboard-response.dto';
import {
  TrainerClientOverviewItemDto,
  TrainerClientOverviewResponseDto,
} from './dto/trainer-client-overview.dto';
import {
  TrainerDashboardInactiveClientItemDto,
  TrainerDashboardMissingPlanDto,
  TrainerDashboardPendingCheckInItemDto,
  TrainerDashboardRecentSessionDto,
  TrainerDashboardResponseDto,
} from './dto/trainer-dashboard-response.dto';

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRequiredDate(value: Date | string): Date {
  const date = toDate(value);
  if (!date) {
    throw new Error('Expected a timestamp from PostgreSQL');
  }
  return date;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  if (date) {
    return toIsoDateString(date);
  }
  if (typeof value === 'string') {
    return toIsoDateString(value);
  }
  return null;
}

function toRequiredIsoDate(value: Date | string): string {
  return (
    toIsoDate(value) ?? toIsoDateString(value) ?? String(value).slice(0, 10)
  );
}

function isTruthyFlag(
  value: boolean | string | number | null | undefined,
): boolean {
  return (
    value === true ||
    value === 't' ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}

export function emptyPerformance(): ClientDashboardPerformanceDto {
  return {
    completedSessions: 0,
    performedSets: 0,
    totalReps: 0,
    externalLoadVolumeKg: 0,
    totalDurationSeconds: 0,
    exercisesPerformed: 0,
  };
}

export function toTrainingPlanSummary(
  row: TrainingPlanSummaryRow | null,
): ClientDashboardTrainingPlanDto | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    startDate: toIsoDate(row.start_date),
    endDate: toIsoDate(row.end_date),
    workoutCount: toCount(row.workout_count),
  };
}

export function toNutritionPlanSummary(
  row: NutritionPlanSummaryRow | null,
): ClientDashboardNutritionPlanDto | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    startDate: toIsoDate(row.start_date),
    endDate: toIsoDate(row.end_date),
    targetCaloriesKcal: toNullableMetricNumber(row.target_calories_kcal),
    targetProteinG: toNullableMetricNumber(row.target_protein_g),
    targetCarbohydratesG: toNullableMetricNumber(row.target_carbohydrates_g),
    targetFatG: toNullableMetricNumber(row.target_fat_g),
    mealPlanTotals: {
      caloriesKcal: toMetricNumber(row.meal_calories_kcal),
      proteinG: toMetricNumber(row.meal_protein_g),
      carbohydratesG: toMetricNumber(row.meal_carbohydrates_g),
      fatG: toMetricNumber(row.meal_fat_g),
      fiberG: toMetricNumber(row.meal_fiber_g),
    },
    mealCount: toCount(row.meal_count),
  };
}

export function toCurrentWorkoutSession(
  row: CurrentSessionRow | null,
): ClientDashboardCurrentWorkoutSessionDto | null {
  if (!row) {
    return null;
  }
  return {
    sessionId: row.session_id,
    workoutName: row.workout_name,
    startedAt: toRequiredDate(row.started_at),
    exerciseCount: toCount(row.exercise_count),
    recordedSetCount: toCount(row.recorded_set_count),
  };
}

export function toRecentCompletedSession(
  row: RecentSessionRow,
): ClientDashboardCompletedSessionDto {
  return {
    id: row.id,
    workoutName: row.workout_name,
    startedAt: toRequiredDate(row.started_at),
    completedAt: toRequiredDate(row.completed_at),
    performedSetCount: toCount(row.performed_set_count),
  };
}

export function toPerformance(
  row: PerformanceRow | undefined,
): ClientDashboardPerformanceDto {
  if (!row) {
    return emptyPerformance();
  }
  return {
    completedSessions: toCount(row.completed_sessions),
    performedSets: toCount(row.performed_sets),
    totalReps: toCount(row.total_reps),
    externalLoadVolumeKg: toMetricNumber(row.external_load_volume_kg),
    totalDurationSeconds: toCount(row.total_duration_seconds),
    exercisesPerformed: toCount(row.exercises_performed),
  };
}

export function toBodyProgress(
  measurements: BodyMeasurementRow[],
  photos: ProgressPhotoSummaryRow,
): ClientDashboardBodyProgressDto | null {
  const latest = measurements[0];
  if (!latest) {
    return null;
  }
  const previous = measurements[1];
  const latestWeight = toNullableMetricNumber(latest.body_weight_kg);
  const previousWeight = previous
    ? toNullableMetricNumber(previous.body_weight_kg)
    : null;
  const latestWaist = toNullableMetricNumber(latest.waist_cm);
  const previousWaist = previous
    ? toNullableMetricNumber(previous.waist_cm)
    : null;

  return {
    id: latest.id,
    measuredAt: toRequiredDate(latest.measured_at),
    bodyWeightKg: latestWeight,
    bodyFatPercentage: toNullableMetricNumber(latest.body_fat_percentage),
    waistCm: latestWaist,
    previousBodyWeightKg: previousWeight,
    bodyWeightChangeKg: metricDelta(latestWeight, previousWeight),
    previousWaistCm: previousWaist,
    waistChangeCm: metricDelta(latestWaist, previousWaist),
    progressPhotoCount: toCount(photos.photo_count),
    latestProgressPhotoCapturedAt: toDate(photos.latest_captured_at),
  };
}

export function toCheckInSummary(
  row: CheckInSummaryRow | null,
): ClientDashboardCheckInDto | null {
  if (!row) {
    return null;
  }
  const hasReview =
    row.status === CheckInStatus.REVIEWED && row.reviewed_at != null;
  return {
    id: row.id,
    periodStart: toRequiredIsoDate(row.period_start),
    periodEnd: toRequiredIsoDate(row.period_end),
    status: row.status,
    submittedAt: toDate(row.submitted_at),
    hasReview,
    reviewedAt: hasReview ? toDate(row.reviewed_at) : null,
  };
}

export function toNotificationsSummary(
  unreadCount: number,
): DashboardNotificationsSummaryDto {
  return { unreadCount: toCount(unreadCount) };
}

export function toClientDashboard(input: {
  periodDays: number;
  trainingPlan: TrainingPlanSummaryRow | null;
  nutritionPlan: NutritionPlanSummaryRow | null;
  currentSession: CurrentSessionRow | null;
  recentSessions: RecentSessionRow[];
  performance: PerformanceRow;
  measurements: BodyMeasurementRow[];
  photos: ProgressPhotoSummaryRow;
  checkIn: CheckInSummaryRow | null;
  unreadCount: number;
}): ClientDashboardResponseDto {
  return {
    periodDays: input.periodDays,
    trainingPlan: toTrainingPlanSummary(input.trainingPlan),
    nutritionPlan: toNutritionPlanSummary(input.nutritionPlan),
    currentWorkoutSession: toCurrentWorkoutSession(input.currentSession),
    recentTraining: {
      completedSessions: input.recentSessions.map(toRecentCompletedSession),
    },
    performance: toPerformance(input.performance),
    bodyProgress: toBodyProgress(input.measurements, input.photos),
    checkIn: toCheckInSummary(input.checkIn),
    notifications: toNotificationsSummary(input.unreadCount),
  };
}

export function toPendingCheckInItem(
  row: PendingCheckInRow,
): TrainerDashboardPendingCheckInItemDto {
  return {
    checkInId: row.check_in_id,
    clientProfileId: row.client_profile_id,
    clientName: clientDisplayName(row.first_name, row.last_name),
    periodStart: toRequiredIsoDate(row.period_start),
    periodEnd: toRequiredIsoDate(row.period_end),
    submittedAt: toRequiredDate(row.submitted_at),
  };
}

export function toInactiveClientItem(
  row: InactiveClientRow,
): TrainerDashboardInactiveClientItemDto {
  return {
    clientProfileId: row.client_profile_id,
    clientName: clientDisplayName(row.first_name, row.last_name),
    lastCompletedWorkoutAt: toDate(row.last_completed_at),
  };
}

export function toMissingPlanItem(
  row: MissingPlanClientRow,
): TrainerDashboardMissingPlanDto['items'][number] {
  return {
    clientProfileId: row.client_profile_id,
    clientName: clientDisplayName(row.first_name, row.last_name),
  };
}

export function toTrainerRecentSession(
  row: TrainerRecentSessionRow,
): TrainerDashboardRecentSessionDto {
  return {
    workoutSessionId: row.workout_session_id,
    clientProfileId: row.client_profile_id,
    clientName: clientDisplayName(row.first_name, row.last_name),
    workoutName: row.workout_name,
    completedAt: toRequiredDate(row.completed_at),
    performedSetCount: toCount(row.performed_set_count),
  };
}

export function toTrainerDashboard(input: {
  inactivityDays: number;
  counts: AssignedClientCountRow;
  pending: { count: number; items: PendingCheckInRow[] };
  inactivity: { count: number; items: InactiveClientRow[] };
  missingTraining: { count: number; items: MissingPlanClientRow[] };
  missingNutrition: { count: number; items: MissingPlanClientRow[] };
  recentSessions: TrainerRecentSessionRow[];
  unreadCount: number;
}): TrainerDashboardResponseDto {
  return {
    activeClientCount: toCount(input.counts.active_client_count),
    disabledAssignedClientCount: toCount(
      input.counts.disabled_assigned_client_count,
    ),
    pendingCheckIns: {
      count: toCount(input.pending.count),
      items: input.pending.items.map(toPendingCheckInItem),
    },
    clientsWithoutRecentTraining: {
      inactivityDays: input.inactivityDays,
      count: toCount(input.inactivity.count),
      items: input.inactivity.items.map(toInactiveClientItem),
    },
    clientsWithoutActiveTrainingPlan: {
      count: toCount(input.missingTraining.count),
      items: input.missingTraining.items.map(toMissingPlanItem),
    },
    clientsWithoutActiveNutritionPlan: {
      count: toCount(input.missingNutrition.count),
      items: input.missingNutrition.items.map(toMissingPlanItem),
    },
    recentCompletedSessions: input.recentSessions.map(toTrainerRecentSession),
    notifications: toNotificationsSummary(input.unreadCount),
  };
}

export function emptyTrainerDashboard(
  inactivityDays: number,
): TrainerDashboardResponseDto {
  return toTrainerDashboard({
    inactivityDays,
    counts: {
      active_client_count: 0,
      disabled_assigned_client_count: 0,
    },
    pending: { count: 0, items: [] },
    inactivity: { count: 0, items: [] },
    missingTraining: { count: 0, items: [] },
    missingNutrition: { count: 0, items: [] },
    recentSessions: [],
    unreadCount: 0,
  });
}

export function toAdminDashboard(
  periodDays: number,
  counts: AdminCountsRow,
  unreadCount: number,
): AdminDashboardResponseDto {
  return {
    periodDays,
    activeTrainers: toCount(counts.active_trainers),
    activeClients: toCount(counts.active_clients),
    currentlyAssignedClients: toCount(counts.currently_assigned_clients),
    unassignedActiveClients: toCount(counts.unassigned_active_clients),
    activeTrainingPlans: toCount(counts.active_training_plans),
    activeNutritionPlans: toCount(counts.active_nutrition_plans),
    completedWorkoutSessions: toCount(counts.completed_workout_sessions),
    pendingCheckIns: toCount(counts.pending_check_ins),
    notifications: toNotificationsSummary(unreadCount),
  };
}

export function emptyAdminDashboard(
  periodDays: number,
): AdminDashboardResponseDto {
  return toAdminDashboard(
    periodDays,
    {
      active_trainers: 0,
      active_clients: 0,
      currently_assigned_clients: 0,
      unassigned_active_clients: 0,
      active_training_plans: 0,
      active_nutrition_plans: 0,
      completed_workout_sessions: 0,
      pending_check_ins: 0,
    },
    0,
  );
}

export function toOverviewItem(row: OverviewRow): TrainerClientOverviewItemDto {
  return {
    clientProfileId: row.client_profile_id,
    clientName: clientDisplayName(row.first_name, row.last_name),
    firstName: row.first_name,
    lastName: row.last_name,
    hasActiveTrainingPlan: row.training_plan_name != null,
    currentTrainingPlanName: row.training_plan_name,
    hasActiveNutritionPlan: row.nutrition_plan_name != null,
    currentNutritionPlanName: row.nutrition_plan_name,
    lastCompletedWorkoutAt: toDate(row.last_completed_at),
    latestCheckInStatus: row.latest_check_in_status,
    latestCheckInPeriodEnd: toIsoDate(row.latest_check_in_period_end),
    hasPendingCheckIn: isTruthyFlag(row.has_pending_check_in),
    latestBodyMeasurementAt: toDate(row.latest_measured_at),
  };
}

export function toOverviewResponse(
  rows: OverviewRow[],
  page: number,
  limit: number,
  totalItems: number,
): TrainerClientOverviewResponseDto {
  return {
    data: rows.map(toOverviewItem),
    meta: {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    },
  };
}
