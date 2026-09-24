import { ExerciseStatus } from '../exercises/enums/exercise-status.enum';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import {
  DurationProgressSectionDto,
  DurationTrendPointDto,
  Estimated1RmPersonalBestDto,
  ExerciseProgressDetailResponseDto,
  ExerciseProgressListItemDto,
  PaginationMetaDto,
  ProgressHistoryOccurrenceDto,
  ProgressHistorySetDto,
  ProgressPersonalBestDto,
  ProgressSessionHistoryItemDto,
  ProgressSummaryResponseDto,
  RepsProgressSectionDto,
  RepsTrendPointDto,
} from './dto/progress-response.dto';
import {
  toCount,
  toMetricNumber,
  toNullableMetricNumber,
} from './progress-metrics.util';

export interface SummaryRow {
  completed_sessions: string | number;
  performed_sets: string | number;
  exercises_performed: string | number;
  total_reps: string | number | null;
  external_load_volume_kg: string | number | null;
  total_duration_seconds: string | number | null;
  first_completed_session_at: Date | string | null;
  last_completed_session_at: Date | string | null;
}

export interface ExerciseListRow {
  exercise_id: string;
  exercise_name: string;
  exercise_status: ExerciseStatus;
  prescription_type: WorkoutPrescriptionType;
  completed_sessions: string | number;
  performed_sets: string | number;
  total_reps: string | number | null;
  external_load_volume_kg: string | number | null;
  best_load_kg: string | number | null;
  best_reps: string | number | null;
  best_estimated_1rm_kg: string | number | null;
  total_duration_seconds: string | number | null;
  best_duration_seconds: string | number | null;
  first_performed_at: Date | string;
  last_performed_at: Date | string;
}

export interface TypeAggregateRow {
  prescription_type: WorkoutPrescriptionType;
  exercise_name: string;
  exercise_status: ExerciseStatus;
  completed_sessions: string | number;
  performed_sets: string | number;
  total_reps: string | number | null;
  external_load_volume_kg: string | number | null;
  best_load_kg: string | number | null;
  best_reps: string | number | null;
  best_estimated_1rm_kg: string | number | null;
  total_duration_seconds: string | number | null;
  best_duration_seconds: string | number | null;
  first_performed_at: Date | string;
  last_performed_at: Date | string;
}

export interface BestRow {
  metric: string;
  value: string | number;
  workout_session_id: string;
  performed_at: Date | string;
  set_number: string | number;
  actual_load_kg: string | number | null;
  actual_reps: string | number | null;
}

export interface HistoryRow {
  workout_session_id: string;
  workout_name: string;
  performed_at: Date | string;
  exercise_name_snapshot: string;
  performed_sets: string | number;
  total_reps: string | number | null;
  session_external_load_volume_kg: string | number | null;
  best_estimated_1rm_kg: string | number | null;
  best_load_kg: string | number | null;
  total_duration_seconds: string | number | null;
  best_duration_seconds: string | number | null;
}

export interface HistorySetRow {
  workout_session_id: string;
  workout_session_exercise_id: string;
  position: string | number;
  exercise_name_snapshot: string;
  id: string;
  set_number: string | number;
  actual_reps: string | number | null;
  actual_duration_seconds: string | number | null;
  actual_load_kg: string | number | null;
  actual_rpe: string | number | null;
  actual_rir: string | number | null;
}

export function emptySummary(): ProgressSummaryResponseDto {
  return {
    completedSessions: 0,
    performedSets: 0,
    exercisesPerformed: 0,
    totalReps: 0,
    externalLoadVolumeKg: 0,
    totalDurationSeconds: 0,
    firstCompletedSessionAt: null,
    lastCompletedSessionAt: null,
  };
}

export function toSummary(
  row: SummaryRow | undefined,
): ProgressSummaryResponseDto {
  if (!row) {
    return emptySummary();
  }
  return {
    completedSessions: toCount(row.completed_sessions),
    performedSets: toCount(row.performed_sets),
    exercisesPerformed: toCount(row.exercises_performed),
    totalReps: toCount(row.total_reps),
    externalLoadVolumeKg: toMetricNumber(row.external_load_volume_kg),
    totalDurationSeconds: toCount(row.total_duration_seconds),
    firstCompletedSessionAt: toDate(row.first_completed_session_at),
    lastCompletedSessionAt: toDate(row.last_completed_session_at),
  };
}

export function toListItem(row: ExerciseListRow): ExerciseProgressListItemDto {
  const isReps = row.prescription_type === WorkoutPrescriptionType.REPS;
  return {
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    exerciseStatus: row.exercise_status,
    prescriptionType: row.prescription_type,
    completedSessions: toCount(row.completed_sessions),
    performedSets: toCount(row.performed_sets),
    totalReps: isReps ? toCount(row.total_reps) : null,
    externalLoadVolumeKg: isReps
      ? toMetricNumber(row.external_load_volume_kg)
      : null,
    bestLoadKg: isReps ? toNullableMetricNumber(row.best_load_kg) : null,
    bestReps: isReps ? toNullableCount(row.best_reps) : null,
    bestEstimated1RmKg: isReps
      ? toNullableMetricNumber(row.best_estimated_1rm_kg)
      : null,
    totalDurationSeconds: isReps
      ? null
      : toNullableCount(row.total_duration_seconds),
    bestDurationSeconds: isReps
      ? null
      : toNullableCount(row.best_duration_seconds),
    firstPerformedAt: toRequiredDate(row.first_performed_at),
    lastPerformedAt: toRequiredDate(row.last_performed_at),
  };
}

export function paginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetaDto {
  return {
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
}

export function toPersonalBest(
  row: BestRow | undefined,
): ProgressPersonalBestDto | null {
  if (!row) {
    return null;
  }
  return {
    value: toMetricNumber(row.value),
    workoutSessionId: row.workout_session_id,
    performedAt: toRequiredDate(row.performed_at),
    setNumber: toCount(row.set_number),
  };
}

export function toIntegerPersonalBest(
  row: BestRow | undefined,
): ProgressPersonalBestDto | null {
  if (!row) {
    return null;
  }
  return {
    value: toCount(row.value),
    workoutSessionId: row.workout_session_id,
    performedAt: toRequiredDate(row.performed_at),
    setNumber: toCount(row.set_number),
  };
}

export function toEstimated1RmBest(
  row: BestRow | undefined,
): Estimated1RmPersonalBestDto | null {
  if (!row) {
    return null;
  }
  return {
    value: toMetricNumber(row.value),
    actualLoadKg: toMetricNumber(row.actual_load_kg),
    actualReps: toCount(row.actual_reps),
    workoutSessionId: row.workout_session_id,
    performedAt: toRequiredDate(row.performed_at),
    setNumber: toCount(row.set_number),
  };
}

export function toHistoryItems(
  rows: HistoryRow[],
  setRows: HistorySetRow[],
  prescriptionType: WorkoutPrescriptionType,
): ProgressSessionHistoryItemDto[] {
  const setsBySession = new Map<string, HistorySetRow[]>();
  for (const setRow of setRows) {
    const list = setsBySession.get(setRow.workout_session_id) ?? [];
    list.push(setRow);
    setsBySession.set(setRow.workout_session_id, list);
  }

  return rows.map((row) => {
    const isReps = prescriptionType === WorkoutPrescriptionType.REPS;
    return {
      workoutSessionId: row.workout_session_id,
      workoutName: row.workout_name,
      performedAt: toRequiredDate(row.performed_at),
      exerciseNameSnapshot: row.exercise_name_snapshot,
      occurrences: toOccurrences(
        setsBySession.get(row.workout_session_id) ?? [],
      ),
      sessionExternalLoadVolumeKg: isReps
        ? toMetricNumber(row.session_external_load_volume_kg)
        : null,
      bestEstimated1RmKg: isReps
        ? toNullableMetricNumber(row.best_estimated_1rm_kg)
        : null,
      totalDurationSeconds: isReps ? null : toCount(row.total_duration_seconds),
      bestDurationSeconds: isReps
        ? null
        : toNullableCount(row.best_duration_seconds),
    };
  });
}

export function toRepsTrend(rows: HistoryRow[]): RepsTrendPointDto[] {
  return rows.map((row) => ({
    performedAt: toRequiredDate(row.performed_at),
    workoutSessionId: row.workout_session_id,
    bestLoadKg: toNullableMetricNumber(row.best_load_kg),
    bestEstimated1RmKg: toNullableMetricNumber(row.best_estimated_1rm_kg),
    externalLoadVolumeKg: toMetricNumber(row.session_external_load_volume_kg),
    totalReps: toCount(row.total_reps),
  }));
}

export function toDurationTrend(rows: HistoryRow[]): DurationTrendPointDto[] {
  return rows.map((row) => ({
    performedAt: toRequiredDate(row.performed_at),
    workoutSessionId: row.workout_session_id,
    bestDurationSeconds: toNullableCount(row.best_duration_seconds),
    totalDurationSeconds: toCount(row.total_duration_seconds),
    performedSets: toCount(row.performed_sets),
  }));
}

export function toRepsSection(
  aggregate: TypeAggregateRow,
  bests: Map<string, BestRow>,
  history: ProgressSessionHistoryItemDto[],
  historyMeta: PaginationMetaDto,
  trend: RepsTrendPointDto[],
): RepsProgressSectionDto {
  const bestLoad = toPersonalBest(bests.get('bestLoadKg'));
  const bestReps = toIntegerPersonalBest(bests.get('bestReps'));
  const bestEstimated1Rm = toEstimated1RmBest(bests.get('bestEstimated1RmKg'));
  return {
    prescriptionType: WorkoutPrescriptionType.REPS,
    completedSessions: toCount(aggregate.completed_sessions),
    performedSets: toCount(aggregate.performed_sets),
    totalReps: toCount(aggregate.total_reps),
    externalLoadVolumeKg: toMetricNumber(aggregate.external_load_volume_kg),
    bestLoadKg:
      bestLoad?.value ?? toNullableMetricNumber(aggregate.best_load_kg),
    bestReps: bestReps?.value ?? toNullableCount(aggregate.best_reps),
    bestEstimated1RmKg:
      bestEstimated1Rm?.value ??
      toNullableMetricNumber(aggregate.best_estimated_1rm_kg),
    firstPerformedAt: toRequiredDate(aggregate.first_performed_at),
    lastPerformedAt: toRequiredDate(aggregate.last_performed_at),
    bestLoad,
    bestRepsRecord: bestReps,
    bestEstimated1Rm,
    history: { data: history, meta: historyMeta },
    trend,
  };
}

export function toDurationSection(
  aggregate: TypeAggregateRow,
  bests: Map<string, BestRow>,
  history: ProgressSessionHistoryItemDto[],
  historyMeta: PaginationMetaDto,
  trend: DurationTrendPointDto[],
): DurationProgressSectionDto {
  const bestDuration = toIntegerPersonalBest(bests.get('bestDurationSeconds'));
  return {
    prescriptionType: WorkoutPrescriptionType.DURATION,
    completedSessions: toCount(aggregate.completed_sessions),
    performedSets: toCount(aggregate.performed_sets),
    totalDurationSeconds: toCount(aggregate.total_duration_seconds),
    bestDurationSeconds:
      bestDuration?.value ?? toNullableCount(aggregate.best_duration_seconds),
    firstPerformedAt: toRequiredDate(aggregate.first_performed_at),
    lastPerformedAt: toRequiredDate(aggregate.last_performed_at),
    bestDuration,
    history: { data: history, meta: historyMeta },
    trend,
  };
}

export function toDetailResponse(
  exerciseId: string,
  availableTypes: WorkoutPrescriptionType[],
  identity: Pick<TypeAggregateRow, 'exercise_name' | 'exercise_status'>,
  reps: RepsProgressSectionDto | null,
  duration: DurationProgressSectionDto | null,
): ExerciseProgressDetailResponseDto {
  return {
    exerciseId,
    exerciseName: identity.exercise_name,
    exerciseStatus: identity.exercise_status,
    availablePrescriptionTypes: availableTypes,
    reps,
    duration,
  };
}

function toOccurrences(rows: HistorySetRow[]): ProgressHistoryOccurrenceDto[] {
  const byOccurrence = new Map<string, ProgressHistoryOccurrenceDto>();
  const order: string[] = [];
  for (const row of rows) {
    let occurrence = byOccurrence.get(row.workout_session_exercise_id);
    if (!occurrence) {
      occurrence = {
        workoutSessionExerciseId: row.workout_session_exercise_id,
        position: toCount(row.position),
        exerciseNameSnapshot: row.exercise_name_snapshot,
        sets: [],
      };
      byOccurrence.set(row.workout_session_exercise_id, occurrence);
      order.push(row.workout_session_exercise_id);
    }
    occurrence.sets.push(toHistorySet(row));
  }
  return order
    .map((id) => byOccurrence.get(id))
    .filter((item): item is ProgressHistoryOccurrenceDto => item !== undefined)
    .sort((left, right) => left.position - right.position);
}

function toHistorySet(row: HistorySetRow): ProgressHistorySetDto {
  return {
    id: row.id,
    setNumber: toCount(row.set_number),
    actualReps: toNullableCount(row.actual_reps),
    actualDurationSeconds: toNullableCount(row.actual_duration_seconds),
    actualLoadKg: toNullableMetricNumber(row.actual_load_kg),
    actualRpe: toNullableMetricNumber(row.actual_rpe, 1),
    actualRir: toNullableCount(row.actual_rir),
  };
}

function toNullableCount(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toCount(value);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function toRequiredDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
