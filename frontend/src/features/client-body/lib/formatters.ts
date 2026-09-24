import { format, isValid, parseISO } from 'date-fns';
import { finiteNumber } from '@/features/client-body/lib/finite-number';

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

export function formatBodyAmount(value: unknown): string | null {
  const amount = finiteNumber(value);
  if (amount === null) {
    return null;
  }
  return numberFormat.format(amount);
}

export function formatKg(value: unknown): string | null {
  const amount = formatBodyAmount(value);
  return amount === null ? null : `${amount} kg`;
}

export function formatCm(value: unknown): string | null {
  const amount = formatBodyAmount(value);
  return amount === null ? null : `${amount} cm`;
}

export function formatBodyFat(value: unknown): string | null {
  const amount = formatBodyAmount(value);
  return amount === null ? null : `${amount}%`;
}

export function formatMeasuredAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'd MMM yyyy, HH:mm') : null;
}

export function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd'T'HH:mm") : '';
}

export function datetimeLocalToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
