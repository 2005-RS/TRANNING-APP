import { DataSource } from 'typeorm';
import { CheckInStatus } from '../check-ins/enums/check-in-status.enum';
import { ProgressPhotoStatus } from '../progress-photos/enums/progress-photo-status.enum';
import {
  COMPLETED_SET_FROM,
  SqlParams,
  volumeSumSql,
} from '../progress/progress-sql';
import { escapeIlike } from '../progress/progress-metrics.util';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { WorkoutSessionStatus } from '../workout-sessions/enums/workout-session-status.enum';
import {
  CLIENT_RECENT_COMPLETED_SESSIONS_MAX,
  TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT,
  TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE,
  TRAINER_INACTIVITY_LIST_MAX,
  TRAINER_MISSING_PLAN_LIST_MAX,
  TRAINER_PENDING_CHECK_INS_MAX,
  TRAINER_RECENT_COMPLETED_SESSIONS_MAX,
} from './dashboard.constants';
import { TrainerClientOverviewQueryDto } from './dto/trainer-client-overview.dto';

export function periodStartExpr(params: SqlParams, periodDays: number): string {
  return `(NOW() - (${params.add(periodDays)}::int * INTERVAL '1 day'))`;
}

async function queryRows<T>(
  dataSource: DataSource,
  sql: string,
  values: unknown[],
): Promise<T[]> {
  return dataSource.query(sql, values) as Promise<T[]>;
}

export interface TrainingPlanSummaryRow {
  id: string;
  name: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  workout_count: string | number;
}

export interface NutritionPlanSummaryRow {
  id: string;
  name: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  target_calories_kcal: string | number | null;
  target_protein_g: string | number | null;
  target_carbohydrates_g: string | number | null;
  target_fat_g: string | number | null;
  meal_count: string | number;
  meal_calories_kcal: string | number | null;
  meal_protein_g: string | number | null;
  meal_carbohydrates_g: string | number | null;
  meal_fat_g: string | number | null;
  meal_fiber_g: string | number | null;
}

export interface CurrentSessionRow {
  session_id: string;
  workout_name: string;
  started_at: Date | string;
  exercise_count: string | number;
  recorded_set_count: string | number;
}

export interface RecentSessionRow {
  id: string;
  workout_name: string;
  started_at: Date | string;
  completed_at: Date | string;
  performed_set_count: string | number;
}

export interface PerformanceRow {
  completed_sessions: string | number;
  performed_sets: string | number;
  exercises_performed: string | number;
  total_reps: string | number | null;
  external_load_volume_kg: string | number | null;
  total_duration_seconds: string | number | null;
}

export interface BodyMeasurementRow {
  id: string;
  measured_at: Date | string;
  body_weight_kg: string | number | null;
  body_fat_percentage: string | number | null;
  waist_cm: string | number | null;
}

export interface ProgressPhotoSummaryRow {
  photo_count: string | number;
  latest_captured_at: Date | string | null;
}

export interface CheckInSummaryRow {
  id: string;
  period_start: Date | string;
  period_end: Date | string;
  status: CheckInStatus;
  submitted_at: Date | string | null;
  reviewed_at: Date | string | null;
}

export interface CountRow {
  count: string | number;
}

export interface AssignedClientCountRow {
  active_client_count: string | number;
  disabled_assigned_client_count: string | number;
}

export interface PendingCheckInRow {
  check_in_id: string;
  client_profile_id: string;
  first_name: string;
  last_name: string;
  period_start: Date | string;
  period_end: Date | string;
  submitted_at: Date | string;
}

export interface InactiveClientRow {
  client_profile_id: string;
  first_name: string;
  last_name: string;
  last_completed_at: Date | string | null;
}

export interface MissingPlanClientRow {
  client_profile_id: string;
  first_name: string;
  last_name: string;
}

export interface TrainerRecentSessionRow {
  workout_session_id: string;
  client_profile_id: string;
  first_name: string;
  last_name: string;
  workout_name: string;
  completed_at: Date | string;
  performed_set_count: string | number;
}

export interface AdminCountsRow {
  active_trainers: string | number;
  active_clients: string | number;
  currently_assigned_clients: string | number;
  unassigned_active_clients: string | number;
  active_training_plans: string | number;
  active_nutrition_plans: string | number;
  completed_workout_sessions: string | number;
  pending_check_ins: string | number;
}

export interface OverviewRow {
  client_profile_id: string;
  first_name: string;
  last_name: string;
  training_plan_name: string | null;
  nutrition_plan_name: string | null;
  last_completed_at: Date | string | null;
  latest_check_in_status: CheckInStatus | null;
  latest_check_in_period_end: Date | string | null;
  has_pending_check_in: boolean | string | number;
  latest_measured_at: Date | string | null;
}

function assignedActiveClientsFrom(trainerParam: string): string {
  return `
  FROM trainer_client_assignments a
  INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
  INNER JOIN users u ON u.id = cp.user_id
  WHERE a.trainer_profile_id = ${trainerParam}
    AND a.ended_at IS NULL
    AND u.status = '${UserStatus.ACTIVE}'
  `;
}

export async function loadActiveTrainingPlan(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<TrainingPlanSummaryRow | null> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const rows = await queryRows<TrainingPlanSummaryRow>(
    dataSource,
    `
    SELECT
      p.id,
      p.name,
      p.start_date,
      p.end_date,
      (
        SELECT COUNT(*)::int
        FROM training_plan_workouts w
        WHERE w.training_plan_id = p.id
      ) AS workout_count
    FROM training_plans p
    WHERE p.client_profile_id = ${client}
      AND p.status = 'ACTIVE'
    LIMIT 1
    `,
    params.values,
  );
  return rows[0] ?? null;
}

export async function loadActiveNutritionPlan(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<NutritionPlanSummaryRow | null> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const rows = await queryRows<NutritionPlanSummaryRow>(
    dataSource,
    `
    SELECT
      p.id,
      p.name,
      p.start_date,
      p.end_date,
      p.target_calories_kcal,
      p.target_protein_g,
      p.target_carbohydrates_g,
      p.target_fat_g,
      (
        SELECT COUNT(*)::int
        FROM nutrition_plan_meals m
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_count,
      (
        SELECT COALESCE(ROUND(SUM((i.calories_per_100g_snapshot * i.quantity_grams) / 100), 2), 0)
        FROM nutrition_plan_meals m
        INNER JOIN nutrition_plan_meal_items i ON i.nutrition_plan_meal_id = m.id
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_calories_kcal,
      (
        SELECT COALESCE(ROUND(SUM((i.protein_g_per_100g_snapshot * i.quantity_grams) / 100), 2), 0)
        FROM nutrition_plan_meals m
        INNER JOIN nutrition_plan_meal_items i ON i.nutrition_plan_meal_id = m.id
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_protein_g,
      (
        SELECT COALESCE(ROUND(SUM((i.carbohydrates_g_per_100g_snapshot * i.quantity_grams) / 100), 2), 0)
        FROM nutrition_plan_meals m
        INNER JOIN nutrition_plan_meal_items i ON i.nutrition_plan_meal_id = m.id
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_carbohydrates_g,
      (
        SELECT COALESCE(ROUND(SUM((i.fat_g_per_100g_snapshot * i.quantity_grams) / 100), 2), 0)
        FROM nutrition_plan_meals m
        INNER JOIN nutrition_plan_meal_items i ON i.nutrition_plan_meal_id = m.id
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_fat_g,
      (
        SELECT COALESCE(ROUND(SUM((COALESCE(i.fiber_g_per_100g_snapshot, 0) * i.quantity_grams) / 100), 2), 0)
        FROM nutrition_plan_meals m
        INNER JOIN nutrition_plan_meal_items i ON i.nutrition_plan_meal_id = m.id
        WHERE m.nutrition_plan_id = p.id
      ) AS meal_fiber_g
    FROM nutrition_plans p
    WHERE p.client_profile_id = ${client}
      AND p.status = 'ACTIVE'
    LIMIT 1
    `,
    params.values,
  );
  return rows[0] ?? null;
}

export async function loadCurrentWorkoutSession(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<CurrentSessionRow | null> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const rows = await queryRows<CurrentSessionRow>(
    dataSource,
    `
    SELECT
      s.id AS session_id,
      s.workout_name_snapshot AS workout_name,
      s.started_at,
      (
        SELECT COUNT(*)::int
        FROM workout_session_exercises wse
        WHERE wse.workout_session_id = s.id
      ) AS exercise_count,
      (
        SELECT COUNT(*)::int
        FROM workout_sets set_row
        INNER JOIN workout_session_exercises wse
          ON wse.id = set_row.workout_session_exercise_id
        WHERE wse.workout_session_id = s.id
      ) AS recorded_set_count
    FROM workout_sessions s
    WHERE s.client_profile_id = ${client}
      AND s.status = '${WorkoutSessionStatus.IN_PROGRESS}'
    LIMIT 1
    `,
    params.values,
  );
  return rows[0] ?? null;
}

export async function loadRecentCompletedSessions(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<RecentSessionRow[]> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const limit = params.add(CLIENT_RECENT_COMPLETED_SESSIONS_MAX);
  return queryRows<RecentSessionRow>(
    dataSource,
    `
    SELECT
      s.id,
      s.workout_name_snapshot AS workout_name,
      s.started_at,
      s.completed_at,
      (
        SELECT COUNT(*)::int
        FROM workout_sets set_row
        INNER JOIN workout_session_exercises wse
          ON wse.id = set_row.workout_session_exercise_id
        WHERE wse.workout_session_id = s.id
      ) AS performed_set_count
    FROM workout_sessions s
    WHERE s.client_profile_id = ${client}
      AND s.status = '${WorkoutSessionStatus.COMPLETED}'
    ORDER BY s.completed_at DESC, s.started_at DESC
    LIMIT ${limit}
    `,
    params.values,
  );
}

export async function loadPerformanceSummary(
  dataSource: DataSource,
  clientProfileId: string,
  periodDays: number,
): Promise<PerformanceRow> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const startedAfter = periodStartExpr(params, periodDays);
  const rows = await queryRows<PerformanceRow>(
    dataSource,
    `
    SELECT
      COUNT(DISTINCT s.id) AS completed_sessions,
      COUNT(set_row.id) AS performed_sets,
      COUNT(DISTINCT wse.exercise_id) AS exercises_performed,
      COALESCE(SUM(set_row.actual_reps) FILTER (WHERE wse.prescription_type = 'REPS'), 0) AS total_reps,
      COALESCE(ROUND(${volumeSumSql(`wse.prescription_type = 'REPS'`)}, 2), 0) AS external_load_volume_kg,
      COALESCE(SUM(set_row.actual_duration_seconds) FILTER (WHERE wse.prescription_type = 'DURATION'), 0) AS total_duration_seconds
    ${COMPLETED_SET_FROM}
    WHERE s.client_profile_id = ${client}
      AND s.status = '${WorkoutSessionStatus.COMPLETED}'
      AND s.started_at >= ${startedAfter}
    `,
    params.values,
  );
  return (
    rows[0] ?? {
      completed_sessions: 0,
      performed_sets: 0,
      exercises_performed: 0,
      total_reps: 0,
      external_load_volume_kg: 0,
      total_duration_seconds: 0,
    }
  );
}

export async function loadLatestBodyMeasurements(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<BodyMeasurementRow[]> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  return queryRows<BodyMeasurementRow>(
    dataSource,
    `
    SELECT id, measured_at, body_weight_kg, body_fat_percentage, waist_cm
    FROM body_measurements
    WHERE client_profile_id = ${client}
    ORDER BY measured_at DESC, created_at DESC
    LIMIT 2
    `,
    params.values,
  );
}

export async function loadProgressPhotoSummary(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<ProgressPhotoSummaryRow> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const rows = await queryRows<ProgressPhotoSummaryRow>(
    dataSource,
    `
    SELECT
      COUNT(*) FILTER (WHERE status = '${ProgressPhotoStatus.READY}') AS photo_count,
      MAX(captured_at) FILTER (WHERE status = '${ProgressPhotoStatus.READY}') AS latest_captured_at
    FROM progress_photos
    WHERE client_profile_id = ${client}
    `,
    params.values,
  );
  return rows[0] ?? { photo_count: 0, latest_captured_at: null };
}

export async function loadLatestCheckIn(
  dataSource: DataSource,
  clientProfileId: string,
): Promise<CheckInSummaryRow | null> {
  const params = new SqlParams();
  const client = params.add(clientProfileId);
  const rows = await queryRows<CheckInSummaryRow>(
    dataSource,
    `
    SELECT
      ci.id,
      ci.period_start,
      ci.period_end,
      ci.status,
      ci.submitted_at,
      r.created_at AS reviewed_at
    FROM check_ins ci
    LEFT JOIN check_in_reviews r ON r.check_in_id = ci.id
    WHERE ci.client_profile_id = ${client}
    ORDER BY ci.period_start DESC, ci.created_at DESC
    LIMIT 1
    `,
    params.values,
  );
  return rows[0] ?? null;
}

export async function loadUnreadNotificationCount(
  dataSource: DataSource,
  recipientUserId: string,
): Promise<number> {
  const params = new SqlParams();
  const recipient = params.add(recipientUserId);
  const rows = await queryRows<CountRow>(
    dataSource,
    `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE recipient_user_id = ${recipient}
      AND read_at IS NULL
    `,
    params.values,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function loadAssignedClientCounts(
  dataSource: DataSource,
  trainerProfileId: string,
): Promise<AssignedClientCountRow> {
  const params = new SqlParams();
  const trainer = params.add(trainerProfileId);
  const rows = await queryRows<AssignedClientCountRow>(
    dataSource,
    `
    SELECT
      COUNT(*) FILTER (WHERE u.status = '${UserStatus.ACTIVE}') AS active_client_count,
      COUNT(*) FILTER (WHERE u.status = '${UserStatus.DISABLED}') AS disabled_assigned_client_count
    FROM trainer_client_assignments a
    INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
    INNER JOIN users u ON u.id = cp.user_id
    WHERE a.trainer_profile_id = ${trainer}
      AND a.ended_at IS NULL
    `,
    params.values,
  );
  return (
    rows[0] ?? {
      active_client_count: 0,
      disabled_assigned_client_count: 0,
    }
  );
}

export async function loadPendingCheckIns(
  dataSource: DataSource,
  trainerProfileId: string,
): Promise<{ count: number; items: PendingCheckInRow[] }> {
  const params = new SqlParams();
  const trainer = params.add(trainerProfileId);
  const countRows = await queryRows<CountRow>(
    dataSource,
    `
    SELECT COUNT(*) AS count
    FROM trainer_client_assignments a
    INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
    INNER JOIN users u ON u.id = cp.user_id
    INNER JOIN check_ins ci ON ci.client_profile_id = cp.id
    WHERE a.trainer_profile_id = ${trainer}
      AND a.ended_at IS NULL
      AND ci.status = '${CheckInStatus.SUBMITTED}'
      AND u.status = '${UserStatus.ACTIVE}'
    `,
    params.values,
  );

  const listParams = new SqlParams();
  const listTrainer = listParams.add(trainerProfileId);
  const limit = listParams.add(TRAINER_PENDING_CHECK_INS_MAX);
  const items = await queryRows<PendingCheckInRow>(
    dataSource,
    `
    SELECT
      ci.id AS check_in_id,
      ci.client_profile_id,
      u.first_name,
      u.last_name,
      ci.period_start,
      ci.period_end,
      ci.submitted_at
    FROM trainer_client_assignments a
    INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
    INNER JOIN users u ON u.id = cp.user_id
    INNER JOIN check_ins ci ON ci.client_profile_id = cp.id
    WHERE a.trainer_profile_id = ${listTrainer}
      AND a.ended_at IS NULL
      AND ci.status = '${CheckInStatus.SUBMITTED}'
      AND u.status = '${UserStatus.ACTIVE}'
    ORDER BY ci.submitted_at ASC, ci.id ASC
    LIMIT ${limit}
    `,
    listParams.values,
  );

  return { count: Number(countRows[0]?.count ?? 0), items };
}

export async function loadClientsWithoutRecentTraining(
  dataSource: DataSource,
  trainerProfileId: string,
  inactivityDays: number,
): Promise<{ count: number; items: InactiveClientRow[] }> {
  const inactivityPredicate = (params: SqlParams): string => `
    NOT EXISTS (
      SELECT 1
      FROM workout_sessions s
      WHERE s.client_profile_id = cp.id
        AND s.status = '${WorkoutSessionStatus.COMPLETED}'
        AND s.started_at >= ${periodStartExpr(params, inactivityDays)}
    )
  `;

  const countParams = new SqlParams();
  const countTrainer = countParams.add(trainerProfileId);
  const countRows = await queryRows<CountRow>(
    dataSource,
    `
    SELECT COUNT(*) AS count
    ${assignedActiveClientsFrom(countTrainer)}
      AND ${inactivityPredicate(countParams)}
    `,
    countParams.values,
  );

  const listParams = new SqlParams();
  const listTrainer = listParams.add(trainerProfileId);
  const inactivitySql = inactivityPredicate(listParams);
  const limit = listParams.add(TRAINER_INACTIVITY_LIST_MAX);
  const items = await queryRows<InactiveClientRow>(
    dataSource,
    `
    SELECT
      cp.id AS client_profile_id,
      u.first_name,
      u.last_name,
      (
        SELECT s.completed_at
        FROM workout_sessions s
        WHERE s.client_profile_id = cp.id
          AND s.status = '${WorkoutSessionStatus.COMPLETED}'
        ORDER BY s.completed_at DESC, s.started_at DESC
        LIMIT 1
      ) AS last_completed_at
    ${assignedActiveClientsFrom(listTrainer)}
      AND ${inactivitySql}
    ORDER BY u.last_name ASC, u.first_name ASC, cp.id ASC
    LIMIT ${limit}
    `,
    listParams.values,
  );

  return { count: Number(countRows[0]?.count ?? 0), items };
}

export async function loadClientsWithoutActivePlan(
  dataSource: DataSource,
  trainerProfileId: string,
  planTable: 'training_plans' | 'nutrition_plans',
): Promise<{ count: number; items: MissingPlanClientRow[] }> {
  const missingPredicate = `
    NOT EXISTS (
      SELECT 1
      FROM ${planTable} p
      WHERE p.client_profile_id = cp.id
        AND p.status = 'ACTIVE'
    )
  `;

  const countParams = new SqlParams();
  const countTrainer = countParams.add(trainerProfileId);
  const countRows = await queryRows<CountRow>(
    dataSource,
    `
    SELECT COUNT(*) AS count
    ${assignedActiveClientsFrom(countTrainer)}
      AND ${missingPredicate}
    `,
    countParams.values,
  );

  const listParams = new SqlParams();
  const listTrainer = listParams.add(trainerProfileId);
  const limit = listParams.add(TRAINER_MISSING_PLAN_LIST_MAX);
  const items = await queryRows<MissingPlanClientRow>(
    dataSource,
    `
    SELECT
      cp.id AS client_profile_id,
      u.first_name,
      u.last_name
    ${assignedActiveClientsFrom(listTrainer)}
      AND ${missingPredicate}
    ORDER BY u.last_name ASC, u.first_name ASC, cp.id ASC
    LIMIT ${limit}
    `,
    listParams.values,
  );

  return { count: Number(countRows[0]?.count ?? 0), items };
}

export async function loadTrainerRecentCompletedSessions(
  dataSource: DataSource,
  trainerProfileId: string,
): Promise<TrainerRecentSessionRow[]> {
  const params = new SqlParams();
  const trainer = params.add(trainerProfileId);
  const limit = params.add(TRAINER_RECENT_COMPLETED_SESSIONS_MAX);
  return queryRows<TrainerRecentSessionRow>(
    dataSource,
    `
    SELECT
      s.id AS workout_session_id,
      s.client_profile_id,
      u.first_name,
      u.last_name,
      s.workout_name_snapshot AS workout_name,
      s.completed_at,
      (
        SELECT COUNT(*)::int
        FROM workout_sets set_row
        INNER JOIN workout_session_exercises wse
          ON wse.id = set_row.workout_session_exercise_id
        WHERE wse.workout_session_id = s.id
      ) AS performed_set_count
    FROM trainer_client_assignments a
    INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
    INNER JOIN users u ON u.id = cp.user_id
    INNER JOIN workout_sessions s ON s.client_profile_id = cp.id
    WHERE a.trainer_profile_id = ${trainer}
      AND a.ended_at IS NULL
      AND s.status = '${WorkoutSessionStatus.COMPLETED}'
      AND u.status = '${UserStatus.ACTIVE}'
    ORDER BY s.completed_at DESC, s.started_at DESC
    LIMIT ${limit}
    `,
    params.values,
  );
}

export async function loadAdminCounts(
  dataSource: DataSource,
  periodDays: number,
): Promise<AdminCountsRow> {
  const params = new SqlParams();
  const startedAfter = periodStartExpr(params, periodDays);
  const rows = await queryRows<AdminCountsRow>(
    dataSource,
    `
    SELECT
      (
        SELECT COUNT(*)
        FROM trainer_profiles tp
        INNER JOIN users u ON u.id = tp.user_id
        WHERE u.role = '${UserRole.TRAINER}'
          AND u.status = '${UserStatus.ACTIVE}'
      ) AS active_trainers,
      (
        SELECT COUNT(*)
        FROM client_profiles cp
        INNER JOIN users u ON u.id = cp.user_id
        WHERE u.role = '${UserRole.CLIENT}'
          AND u.status = '${UserStatus.ACTIVE}'
      ) AS active_clients,
      (
        SELECT COUNT(DISTINCT a.client_profile_id)
        FROM trainer_client_assignments a
        INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
        INNER JOIN users u ON u.id = cp.user_id
        WHERE a.ended_at IS NULL
          AND u.status = '${UserStatus.ACTIVE}'
      ) AS currently_assigned_clients,
      (
        SELECT COUNT(*)
        FROM client_profiles cp
        INNER JOIN users u ON u.id = cp.user_id
        WHERE u.role = '${UserRole.CLIENT}'
          AND u.status = '${UserStatus.ACTIVE}'
          AND NOT EXISTS (
            SELECT 1
            FROM trainer_client_assignments a
            WHERE a.client_profile_id = cp.id
              AND a.ended_at IS NULL
          )
      ) AS unassigned_active_clients,
      (
        SELECT COUNT(*)
        FROM training_plans
        WHERE status = 'ACTIVE'
      ) AS active_training_plans,
      (
        SELECT COUNT(*)
        FROM nutrition_plans
        WHERE status = 'ACTIVE'
      ) AS active_nutrition_plans,
      (
        SELECT COUNT(*)
        FROM workout_sessions
        WHERE status = '${WorkoutSessionStatus.COMPLETED}'
          AND started_at >= ${startedAfter}
      ) AS completed_workout_sessions,
      (
        SELECT COUNT(*)
        FROM check_ins
        WHERE status = '${CheckInStatus.SUBMITTED}'
      ) AS pending_check_ins
    `,
    params.values,
  );
  return (
    rows[0] ?? {
      active_trainers: 0,
      active_clients: 0,
      currently_assigned_clients: 0,
      unassigned_active_clients: 0,
      active_training_plans: 0,
      active_nutrition_plans: 0,
      completed_workout_sessions: 0,
      pending_check_ins: 0,
    }
  );
}

function overviewFilters(
  params: SqlParams,
  query: TrainerClientOverviewQueryDto,
): string {
  const parts: string[] = [];
  const search = query.search?.trim();
  if (search) {
    const pattern = params.add(`%${escapeIlike(search)}%`);
    parts.push(
      `(u.first_name ILIKE ${pattern} ESCAPE '\\' OR u.last_name ILIKE ${pattern} ESCAPE '\\')`,
    );
  }
  if (query.hasActiveTrainingPlan === true) {
    parts.push(`tp.id IS NOT NULL`);
  } else if (query.hasActiveTrainingPlan === false) {
    parts.push(`tp.id IS NULL`);
  }
  if (query.hasActiveNutritionPlan === true) {
    parts.push(`np.id IS NOT NULL`);
  } else if (query.hasActiveNutritionPlan === false) {
    parts.push(`np.id IS NULL`);
  }
  if (query.hasPendingCheckIn === true) {
    parts.push(`pending.has_pending IS TRUE`);
  } else if (query.hasPendingCheckIn === false) {
    parts.push(`pending.has_pending IS NOT TRUE`);
  }
  if (query.inactivityDays !== undefined) {
    parts.push(`
      NOT EXISTS (
        SELECT 1
        FROM workout_sessions s
        WHERE s.client_profile_id = cp.id
          AND s.status = '${WorkoutSessionStatus.COMPLETED}'
          AND s.started_at >= ${periodStartExpr(params, query.inactivityDays)}
      )
    `);
  }
  return parts.length === 0 ? '' : ` AND ${parts.join(' AND ')}`;
}

const OVERVIEW_FROM = `
  FROM trainer_client_assignments a
  INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
  INNER JOIN users u ON u.id = cp.user_id
  LEFT JOIN training_plans tp
    ON tp.client_profile_id = cp.id AND tp.status = 'ACTIVE'
  LEFT JOIN nutrition_plans np
    ON np.client_profile_id = cp.id AND np.status = 'ACTIVE'
  LEFT JOIN LATERAL (
    SELECT s.completed_at AS last_completed_at
    FROM workout_sessions s
    WHERE s.client_profile_id = cp.id
      AND s.status = '${WorkoutSessionStatus.COMPLETED}'
    ORDER BY s.completed_at DESC, s.started_at DESC
    LIMIT 1
  ) last_session ON TRUE
  LEFT JOIN LATERAL (
    SELECT ci.status, ci.period_end
    FROM check_ins ci
    WHERE ci.client_profile_id = cp.id
    ORDER BY ci.period_start DESC, ci.created_at DESC
    LIMIT 1
  ) latest_ci ON TRUE
  LEFT JOIN LATERAL (
    SELECT TRUE AS has_pending
    FROM check_ins ci
    WHERE ci.client_profile_id = cp.id
      AND ci.status = '${CheckInStatus.SUBMITTED}'
    LIMIT 1
  ) pending ON TRUE
  LEFT JOIN LATERAL (
    SELECT bm.measured_at AS latest_measured_at
    FROM body_measurements bm
    WHERE bm.client_profile_id = cp.id
    ORDER BY bm.measured_at DESC, bm.created_at DESC
    LIMIT 1
  ) latest_bm ON TRUE
`;

export async function loadTrainerClientOverview(
  dataSource: DataSource,
  trainerProfileId: string,
  query: TrainerClientOverviewQueryDto,
): Promise<{ totalItems: number; rows: OverviewRow[] }> {
  const page = query.page ?? TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE;
  const limit = query.limit ?? TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT;

  const countParams = new SqlParams();
  const countTrainer = countParams.add(trainerProfileId);
  const countFilters = overviewFilters(countParams, query);
  const countRows = await queryRows<CountRow>(
    dataSource,
    `
    SELECT COUNT(*) AS count
    ${OVERVIEW_FROM}
    WHERE a.trainer_profile_id = ${countTrainer}
      AND a.ended_at IS NULL
      AND u.status = '${UserStatus.ACTIVE}'
      ${countFilters}
    `,
    countParams.values,
  );
  const totalItems = Number(countRows[0]?.count ?? 0);

  const listParams = new SqlParams();
  const listTrainer = listParams.add(trainerProfileId);
  const listFilters = overviewFilters(listParams, query);
  const offset = listParams.add((page - 1) * limit);
  const limitParam = listParams.add(limit);
  const rows = await queryRows<OverviewRow>(
    dataSource,
    `
    SELECT
      cp.id AS client_profile_id,
      u.first_name,
      u.last_name,
      tp.name AS training_plan_name,
      np.name AS nutrition_plan_name,
      last_session.last_completed_at,
      latest_ci.status AS latest_check_in_status,
      latest_ci.period_end AS latest_check_in_period_end,
      COALESCE(pending.has_pending, FALSE) AS has_pending_check_in,
      latest_bm.latest_measured_at
    ${OVERVIEW_FROM}
    WHERE a.trainer_profile_id = ${listTrainer}
      AND a.ended_at IS NULL
      AND u.status = '${UserStatus.ACTIVE}'
      ${listFilters}
    ORDER BY u.last_name ASC, u.first_name ASC, cp.id ASC
    LIMIT ${limitParam} OFFSET ${offset}
    `,
    listParams.values,
  );

  return { totalItems, rows };
}

/**
 * SQL used by EXPLAIN review. Keep in sync with loadTrainerClientOverview /
 * loadClientsWithoutRecentTraining / loadPendingCheckIns.
 */
export const TRAINER_EXPLAIN_PENDING_CHECK_INS_SQL = `
SELECT ci.id
FROM trainer_client_assignments a
INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
INNER JOIN users u ON u.id = cp.user_id
INNER JOIN check_ins ci ON ci.client_profile_id = cp.id
WHERE a.trainer_profile_id = $1
  AND a.ended_at IS NULL
  AND ci.status = 'SUBMITTED'
  AND u.status = 'ACTIVE'
ORDER BY ci.submitted_at ASC
LIMIT 5
`;

export const TRAINER_EXPLAIN_INACTIVITY_SQL = `
SELECT cp.id
FROM trainer_client_assignments a
INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
INNER JOIN users u ON u.id = cp.user_id
WHERE a.trainer_profile_id = $1
  AND a.ended_at IS NULL
  AND u.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM workout_sessions s
    WHERE s.client_profile_id = cp.id
      AND s.status = 'COMPLETED'
      AND s.started_at >= NOW() - ($2::int * INTERVAL '1 day')
  )
`;

export const TRAINER_EXPLAIN_OVERVIEW_SQL = `
SELECT cp.id
FROM trainer_client_assignments a
INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
INNER JOIN users u ON u.id = cp.user_id
LEFT JOIN training_plans tp
  ON tp.client_profile_id = cp.id AND tp.status = 'ACTIVE'
LEFT JOIN nutrition_plans np
  ON np.client_profile_id = cp.id AND np.status = 'ACTIVE'
LEFT JOIN LATERAL (
  SELECT s.completed_at
  FROM workout_sessions s
  WHERE s.client_profile_id = cp.id AND s.status = 'COMPLETED'
  ORDER BY s.completed_at DESC
  LIMIT 1
) last_session ON TRUE
WHERE a.trainer_profile_id = $1
  AND a.ended_at IS NULL
  AND u.status = 'ACTIVE'
ORDER BY u.last_name ASC, u.first_name ASC
LIMIT 20
`;
