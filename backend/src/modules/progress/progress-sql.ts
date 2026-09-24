import {
  ProgressExerciseSortField,
  SortDirection,
} from './enums/progress-exercise-sort-field.enum';
import { epleyEligibleSql, epleySql } from './progress-metrics.util';

export class SqlParams {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

export const COMPLETED_SET_FROM = `
  FROM workout_sessions s
  INNER JOIN workout_session_exercises wse ON wse.workout_session_id = s.id
  INNER JOIN workout_sets set_row ON set_row.workout_session_exercise_id = wse.id
  INNER JOIN exercises e ON e.id = wse.exercise_id
`;

export function completedClientPredicate(
  params: SqlParams,
  clientProfileId: string,
): string {
  const client = params.add(clientProfileId);
  return `s.client_profile_id = ${client} AND s.status = 'COMPLETED'`;
}

export function dateRangePredicate(
  params: SqlParams,
  dateFrom?: string,
  dateTo?: string,
  toDayStart?: (iso: string) => Date,
  toDayEndExclusive?: (iso: string) => Date,
): string {
  const parts: string[] = [];
  if (dateFrom && toDayStart) {
    parts.push(`s.started_at >= ${params.add(toDayStart(dateFrom))}`);
  }
  if (dateTo && toDayEndExclusive) {
    parts.push(`s.started_at < ${params.add(toDayEndExclusive(dateTo))}`);
  }
  return parts.length === 0 ? '' : ` AND ${parts.join(' AND ')}`;
}

export function volumeSumSql(extraPredicate = ''): string {
  const extra = extraPredicate ? ` AND ${extraPredicate}` : '';
  return `SUM(set_row.actual_load_kg * set_row.actual_reps) FILTER (
    WHERE set_row.actual_load_kg IS NOT NULL AND set_row.actual_reps IS NOT NULL${extra}
  )`;
}

export function bestLoadSql(extraPredicate = ''): string {
  const extra = extraPredicate ? ` AND ${extraPredicate}` : '';
  return `MAX(set_row.actual_load_kg) FILTER (
    WHERE set_row.actual_reps > 0 AND set_row.actual_load_kg IS NOT NULL${extra}
  )`;
}

export function bestEstimated1RmSql(extraPredicate = ''): string {
  const extra = extraPredicate ? ` AND ${extraPredicate}` : '';
  return `MAX(${epleySql('set_row')}) FILTER (WHERE ${epleyEligibleSql('set_row')}${extra})`;
}

export const LIST_SORT_SQL: Record<ProgressExerciseSortField, string> = {
  [ProgressExerciseSortField.LastPerformedAt]: 'MAX(s.started_at)',
  [ProgressExerciseSortField.ExerciseName]: 'MIN(e.name)',
  [ProgressExerciseSortField.CompletedSessions]: 'COUNT(DISTINCT s.id)',
  [ProgressExerciseSortField.PerformedSets]: 'COUNT(set_row.id)',
  [ProgressExerciseSortField.BestLoadKg]: bestLoadSql(),
  [ProgressExerciseSortField.BestEstimated1RmKg]: bestEstimated1RmSql(),
};

export function sortDirectionSql(direction?: SortDirection): 'ASC' | 'DESC' {
  return direction === SortDirection.Asc ? 'ASC' : 'DESC';
}
