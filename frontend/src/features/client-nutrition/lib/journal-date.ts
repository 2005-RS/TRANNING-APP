import type { JournalMealDtoMealType } from '@/generated/models';
import { currentIntlLocale } from '@/i18n/format';

/** A sensible default meal for "Add food" by local time of day. */
export function mealForTime(now: Date = new Date()): JournalMealDtoMealType {
  const hour = now.getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 16) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The Client's local calendar date (the journal is keyed by local dates, not UTC). */
export function localIsoDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** YYYY-MM-DD → local Date at midnight (the format is validated by callers). */
function parseLocal(isoDate: string): Date {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  return new Date(year, month - 1, day);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false;
  }
  // Round-trips only for real calendar dates (rejects 2026-02-30).
  return localIsoDate(parseLocal(value)) === value;
}

export function addDays(isoDate: string, days: number): string {
  const date = parseLocal(isoDate);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

export type RelativeDay = 'today' | 'yesterday' | 'tomorrow' | null;

export function relativeDay(isoDate: string, now: Date = new Date()): RelativeDay {
  const today = localIsoDate(now);
  if (isoDate === today) return 'today';
  if (isoDate === addDays(today, -1)) return 'yesterday';
  if (isoDate === addDays(today, 1)) return 'tomorrow';
  return null;
}

export function formatJournalDate(isoDate: string): string {
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseLocal(isoDate));
}
