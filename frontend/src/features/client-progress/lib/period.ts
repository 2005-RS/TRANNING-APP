/** Supported Progress windows. API uses dateFrom/dateTo, not periodDays. */
export const PROGRESS_PERIODS = [7, 30, 90, 180, 365] as const;

export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number];

export const DEFAULT_PROGRESS_PERIOD: ProgressPeriod = 30;

const PERIOD_DAYS: Record<ProgressPeriod, number> = {
  7: 7,
  30: 30,
  90: 90,
  180: 180,
  365: 365,
};

export function isProgressPeriod(value: unknown): value is ProgressPeriod {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (PROGRESS_PERIODS as readonly number[]).includes(value)
  );
}

export function parseProgressPeriod(value: unknown): ProgressPeriod {
  if (isProgressPeriod(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const digits = value.replace(/^"+|"+$/g, '');
    if (/^\d+$/.test(digits)) {
      return parseProgressPeriod(Number(digits));
    }
  }
  return DEFAULT_PROGRESS_PERIOD;
}

export function periodDays(period: ProgressPeriod): number {
  return PERIOD_DAYS[period];
}

/** Inclusive UTC calendar day as YYYY-MM-DD. */
export function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function parseUtcDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export type DateWindow = {
  dateFrom: string;
  dateTo: string;
};

/**
 * Inclusive UTC window ending on `now`'s UTC calendar day.
 * 30 days = today plus the previous 29 UTC days.
 */
export function windowForPeriod(period: ProgressPeriod, now = new Date()): DateWindow {
  const days = periodDays(period);
  const dateTo = utcDateKey(now);
  const end = parseUtcDateKey(dateTo);
  if (!end) {
    return { dateFrom: dateTo, dateTo };
  }
  return {
    dateFrom: utcDateKey(addUtcDays(end, -(days - 1))),
    dateTo,
  };
}

/** Equal-length window immediately before `current`. */
export function previousWindow(current: DateWindow): DateWindow {
  const from = parseUtcDateKey(current.dateFrom);
  const to = parseUtcDateKey(current.dateTo);
  if (!from || !to) {
    return current;
  }
  const lengthDays =
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const previousTo = addUtcDays(from, -1);
  return {
    dateFrom: utcDateKey(addUtcDays(previousTo, -(lengthDays - 1))),
    dateTo: utcDateKey(previousTo),
  };
}
