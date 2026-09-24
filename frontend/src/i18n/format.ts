import { parseISO, isValid } from 'date-fns';
import { intlLocaleFor, type AppLanguage } from '@/i18n/constants';
import { currentLanguage } from '@/i18n/live-copy';
import { commonCopy } from '@/i18n/locales/common-live';

function parseInstant(value: string): Date | null {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function currentIntlLocale(language: AppLanguage = currentLanguage()): string {
  return intlLocaleFor(language);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentIntlLocale(), options).format(value);
}

function dateOptionsFromPattern(pattern?: string): Intl.DateTimeFormatOptions {
  if (pattern === 'd MMM') {
    return { day: 'numeric', month: 'short' };
  }
  if (pattern === 'd MMM yyyy') {
    return { day: 'numeric', month: 'short', year: 'numeric' };
  }
  if (pattern === 'EEEE, d MMMM') {
    return { weekday: 'long', day: 'numeric', month: 'long' };
  }
  return { dateStyle: 'long' };
}

export function formatInstant(
  value: string | Date | null | undefined,
  pattern?: string,
): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat(currentIntlLocale(), dateOptionsFromPattern(pattern)).format(date);
}

export function formatInstantDateTime(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(vars[key] ?? ''));
}

export function formatFromDate(date: string): string {
  return interpolate(commonCopy.dates.from, { date });
}

export function formatUntilDate(date: string): string {
  return interpolate(commonCopy.dates.until, { date });
}

export function formatDurationParts(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null;
  }
  const rounded = Math.round(totalSeconds);
  if (rounded === 0) {
    return interpolate(commonCopy.duration.minutes, { count: 0 });
  }
  if (rounded < 60) {
    return interpolate(commonCopy.duration.seconds, { count: rounded });
  }
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  if (hours === 0) {
    return interpolate(commonCopy.duration.minutes, { count: minutes });
  }
  if (minutes === 0) {
    return interpolate(commonCopy.duration.hours, { count: hours });
  }
  return interpolate(commonCopy.duration.hoursMinutes, { hours, minutes });
}
