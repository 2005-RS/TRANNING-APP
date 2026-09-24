import { finiteNumber } from '@/features/client-check-ins/lib/finite-number';
import { formatInstant, formatInstantDateTime } from '@/i18n/format';

export function formatIsoDate(value: string, pattern = 'd MMM yyyy'): string | null {
  return formatInstant(value, pattern);
}

export function formatIsoDateTime(value: string): string | null {
  return formatInstantDateTime(value);
}

export function formatPeriodRange(periodStart: string, periodEnd: string): string | null {
  const start = formatIsoDate(periodStart);
  const end = formatIsoDate(periodEnd);
  if (start && end) {
    return `${start} – ${end}`;
  }
  return start ?? end;
}

export function formatRating(value: unknown): string | null {
  const parsed = finiteNumber(value);
  return parsed === null ? null : String(parsed);
}

export function formatAdherencePct(value: unknown): string | null {
  const parsed = finiteNumber(value);
  if (parsed === null) {
    return null;
  }
  return `${parsed}%`;
}

export function formatAdherenceInput(value: unknown): string {
  const parsed = finiteNumber(value);
  if (parsed === null) {
    return '';
  }
  return String(parsed);
}
