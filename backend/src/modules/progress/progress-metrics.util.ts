import { BadRequestException } from '@nestjs/common';
import { parseStrictIsoDate } from '../clients/iso-date.util';
import {
  PROGRESS_EPLEY_MAX_REPS,
  PROGRESS_METRIC_SCALE,
} from './progress.constants';

export function roundKg(value: number): number {
  return Number(value.toFixed(PROGRESS_METRIC_SCALE));
}

/**
 * Epley estimated 1RM: load × (1 + reps / 30).
 * Eligible only when load > 0 and 1 <= reps <= 10.
 */
export function estimated1RmKg(loadKg: number, reps: number): number | null {
  if (!(loadKg > 0) || reps < 1 || reps > PROGRESS_EPLEY_MAX_REPS) {
    return null;
  }
  return roundKg(loadKg * (1 + reps / 30));
}

export function epleySql(setAlias: string): string {
  return `ROUND(${setAlias}.actual_load_kg * (1 + ${setAlias}.actual_reps::numeric / 30), ${PROGRESS_METRIC_SCALE})`;
}

export function epleyEligibleSql(setAlias: string): string {
  return `${setAlias}.actual_load_kg > 0 AND ${setAlias}.actual_reps >= 1 AND ${setAlias}.actual_reps <= ${PROGRESS_EPLEY_MAX_REPS}`;
}

export function toMetricNumber(
  value: string | number | null | undefined,
  scale = PROGRESS_METRIC_SCALE,
): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(scale));
}

export function toNullableMetricNumber(
  value: string | number | null | undefined,
  scale = PROGRESS_METRIC_SCALE,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Number(numeric.toFixed(scale));
}

export function toCount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

export function utcDayStart(isoDate: string): Date {
  const parsed = parseStrictIsoDate(isoDate);
  if (!parsed) {
    throw new BadRequestException('Invalid date');
  }
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

export function utcDayEndExclusive(isoDate: string): Date {
  const start = utcDayStart(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
