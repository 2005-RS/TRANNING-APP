import { finiteNumber } from '@/features/trainer-workspace/lib/finite-number';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { commonCopy } from '@/i18n/locales/common-live';
import {
  formatInstant,
  formatInstantDateTime,
  formatNumber,
} from '@/i18n/format';

export function formatIsoDate(value: string | null | undefined, pattern = 'd MMM yyyy'): string | null {
  return formatInstant(value, pattern);
}

export function formatIsoDateTime(value: string | null | undefined): string | null {
  return formatInstantDateTime(value);
}

export function formatPeriodRange(start: string, end: string): string | null {
  const from = formatIsoDate(start);
  const to = formatIsoDate(end);
  if (from && to) {
    return `${from} – ${to}`;
  }
  return from ?? to;
}

export function formatAmount(value: unknown): string | null {
  const amount = finiteNumber(value);
  return amount === null ? null : formatNumber(amount, { maximumFractionDigits: 2 });
}

export function formatKg(value: unknown): string | null {
  const amount = formatAmount(value);
  return amount === null ? null : `${amount} kg`;
}

export function formatGrams(value: unknown): string | null {
  const amount = formatAmount(value);
  return amount === null ? null : `${amount} g`;
}

export function formatKcal(value: unknown): string | null {
  const amount = formatAmount(value);
  return amount === null ? null : `${amount} kcal`;
}

export function formatCm(value: unknown): string | null {
  const amount = formatAmount(value);
  return amount === null ? null : `${amount} cm`;
}

export function formatPercentValue(value: unknown): string | null {
  const amount = formatAmount(value);
  return amount === null ? null : `${amount}%`;
}

export function formatCount(count: number, singular: string, plural: string): string {
  const amount = formatAmount(count) ?? '0';
  return `${amount} ${count === 1 ? singular : plural}`;
}

export function clientDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function humanizeKey(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

export function enumLabel(
  kind: 'muscle' | 'equipment' | 'difficulty',
  value: string,
): string {
  const table = commonCopy.enums[kind] as Record<string, string>;
  return table[value] ?? humanizeKey(value);
}

export function statusLabel(status: string): string {
  const known = trainerWorkspaceCopy.status[status as keyof typeof trainerWorkspaceCopy.status];
  return known ?? humanizeKey(status);
}
