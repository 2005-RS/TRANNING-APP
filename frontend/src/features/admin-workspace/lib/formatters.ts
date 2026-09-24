import { currentIntlLocale, formatInstantDateTime, formatNumber } from '@/i18n/format';

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function displayDateTime(value?: string | null) {
  return formatInstantDateTime(value) ?? '';
}

export function numberText(value: number) {
  return formatNumber(value, { maximumFractionDigits: 2 });
}

/** Calendar dates (YYYY-MM-DD) are rendered without a timezone shift. */
export function displayDate(value?: string | null) {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) {
    return '';
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(currentIntlLocale(), { dateStyle: 'medium' }).format(date);
}

export function formatBytes(bytes: number) {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(currentIntlLocale(), {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

export function optionalText(value: string | null | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

/** Accepts both `.` and `,` as the decimal separator. */
export function parseNumberInput(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
