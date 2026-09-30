import type { JournalMealDtoMealType } from '@/generated/models';
import { isIsoDate } from '@/features/client-nutrition/lib/journal-date';

const MEAL_TYPES: readonly JournalMealDtoMealType[] = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'OTHER',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Search params shared by the journal flow routes (all optional, all validated). */
export type JournalSearch = {
  date?: string;
  meal?: JournalMealDtoMealType;
  /** Plan item being changed ("Cambiar"). */
  replace?: string;
  /** Journal entry being edited. */
  entry?: string;
};

export function isMealType(value: unknown): value is JournalMealDtoMealType {
  return typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value);
}

export function validateJournalSearch(search: Record<string, unknown>): JournalSearch {
  const result: JournalSearch = {};
  if (isIsoDate(search.date)) result.date = search.date;
  if (isMealType(search.meal)) result.meal = search.meal;
  if (typeof search.replace === 'string' && UUID.test(search.replace)) {
    result.replace = search.replace;
  }
  if (typeof search.entry === 'string' && UUID.test(search.entry)) {
    result.entry = search.entry;
  }
  return result;
}
