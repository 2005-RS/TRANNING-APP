import { differenceInCalendarDays, format, isValid, parseISO, subDays } from 'date-fns';

/** Inclusive calendar span: periodEnd − periodStart ≤ 31. */
export const CHECK_IN_MAX_PERIOD_SPAN_DAYS = 31;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDateOnly(value: string): Date | null {
  if (!ISO_DATE.test(value)) {
    return null;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function periodSpanDays(periodStart: string, periodEnd: string): number | null {
  const start = parseIsoDateOnly(periodStart);
  const end = parseIsoDateOnly(periodEnd);
  if (!start || !end) {
    return null;
  }
  return differenceInCalendarDays(end, start);
}

export function defaultPeriodRange(now = new Date()): { periodStart: string; periodEnd: string } {
  return {
    periodStart: format(subDays(now, 6), 'yyyy-MM-dd'),
    periodEnd: format(now, 'yyyy-MM-dd'),
  };
}
