import { formatDurationParts, formatInstant, formatInstantDateTime } from '@/i18n/format';

export function formatIsoDate(value: string, pattern = 'd MMM'): string | null {
  return formatInstant(value, pattern);
}

export function formatIsoDateTime(value: string): string | null {
  return formatInstantDateTime(value);
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

export function formatDecimal(value: number, digits = 1): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(digits);
}

export function formatKg(value: number): string | null {
  const amount = formatDecimal(value);
  return amount ? `${amount} kg` : null;
}

export function formatVolumeKg(value: number): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const amount = formatDecimal(value, value >= 100 ? 0 : 1);
  return amount ? `${amount} kg` : null;
}

export function formatCm(value: number): string | null {
  const amount = formatDecimal(value);
  return amount ? `${amount} cm` : null;
}

export function formatSignedChange(
  value: number,
  unit: 'kg' | 'cm' | '%' | 'sessions' | 'sets' | 'reps',
): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const abs = Math.abs(value);
  let formatted: string | null;
  if (unit === 'kg') {
    formatted = formatKg(abs);
  } else if (unit === 'cm') {
    formatted = formatCm(abs);
  } else if (unit === '%') {
    const amount = formatDecimal(abs);
    formatted = amount ? `${amount}%` : null;
  } else {
    const amount = formatCompactNumber(abs);
    formatted = amount ? `${amount} ${unit}` : null;
  }
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

export function formatPercent(value: number): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const amount = formatDecimal(Math.abs(value));
  if (!amount) {
    return null;
  }
  if (value > 0) {
    return `+${amount}%`;
  }
  if (value < 0) {
    return `−${amount}%`;
  }
  return `${amount}%`;
}

export function formatDurationSeconds(totalSeconds: number): string | null {
  return formatDurationParts(totalSeconds);
}

export function formatCountLabel(count: number, singular: string, plural: string): string {
  const amount = formatCompactNumber(count);
  return `${amount} ${count === 1 ? singular : plural}`;
}
