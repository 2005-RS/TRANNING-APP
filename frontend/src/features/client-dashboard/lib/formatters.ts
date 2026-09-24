import { isValid, parseISO } from 'date-fns';
import { formatFromDate, formatInstant, formatInstantDateTime, formatUntilDate, formatDurationParts } from '@/i18n/format';

function parseInstant(value: string): Date | null {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatIsoDate(value: string, pattern = 'd MMM'): string | null {
  return formatInstant(value, pattern);
}

export function formatIsoDateTime(value: string): string | null {
  return formatInstantDateTime(value);
}

export function formatPlanDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const start = startDate ? formatIsoDate(startDate, 'd MMM yyyy') : null;
  const end = endDate ? formatIsoDate(endDate, 'd MMM yyyy') : null;
  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start) {
    return formatFromDate(start);
  }
  if (end) {
    return formatUntilDate(end);
  }
  return null;
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(1);
}

export function formatKg(value: number): string | null {
  const amount = formatCompactNumber(value);
  return amount ? `${amount} kg` : null;
}

export function formatCm(value: number): string | null {
  const amount = formatCompactNumber(value);
  return amount ? `${amount} cm` : null;
}

export function formatKcal(value: number): string | null {
  const amount = formatCompactNumber(value);
  return amount ? `${amount} kcal` : null;
}

export function formatSignedChange(value: number, unit: 'kg' | 'cm'): string | null {
  const formatted =
    unit === 'kg' ? formatKg(Math.abs(value)) : formatCm(Math.abs(value));
  if (!formatted) {
    return null;
  }
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `−${formatted}`;
  }
  return formatted;
}

export function formatDurationSeconds(totalSeconds: number): string | null {
  return formatDurationParts(totalSeconds);
}

export function formatCountLabel(count: number, singular: string, plural: string): string {
  const amount = formatCompactNumber(count);
  return `${amount} ${count === 1 ? singular : plural}`;
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function lastLocalDays(count: number, now = new Date()): Date[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() - (count - 1 - index));
    return day;
  });
}

export function localDayKeyFromIso(value: string): string | null {
  const parsed = parseInstant(value);
  return parsed ? localDayKey(parsed) : null;
}
