import type { BodyMeasurementResponseDto } from '@/generated/models/bodyMeasurementResponseDto';
import type { DurationTrendPointDto } from '@/generated/models/durationTrendPointDto';
import type { RepsTrendPointDto } from '@/generated/models/repsTrendPointDto';
import { formatIsoDate } from '@/features/client-progress/lib/formatters';

export type ChartPoint = {
  key: string;
  date: string;
  label: string;
  value: number;
  unit: string;
};

export function bodyWeightPoints(
  measurements: BodyMeasurementResponseDto[],
): ChartPoint[] {
  return [...measurements]
    .filter((row): row is BodyMeasurementResponseDto & { bodyWeightKg: number } => {
      return row.bodyWeightKg != null && Number.isFinite(row.bodyWeightKg);
    })
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((row) => ({
      key: row.id,
      date: row.measuredAt,
      label: formatIsoDate(row.measuredAt, 'd MMM') ?? row.measuredAt,
      value: row.bodyWeightKg,
      unit: 'kg',
    }));
}

export function repsVolumePoints(trend: RepsTrendPointDto[]): ChartPoint[] {
  return [...trend]
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((point) => ({
      key: point.workoutSessionId,
      date: point.performedAt,
      label: formatIsoDate(point.performedAt, 'd MMM') ?? point.performedAt,
      value: point.externalLoadVolumeKg,
      unit: 'kg',
    }));
}

export function repsLoadPoints(trend: RepsTrendPointDto[]): ChartPoint[] {
  return [...trend]
    .filter((point) => point.bestLoadKg != null && Number.isFinite(point.bestLoadKg))
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((point) => ({
      key: point.workoutSessionId,
      date: point.performedAt,
      label: formatIsoDate(point.performedAt, 'd MMM') ?? point.performedAt,
      value: point.bestLoadKg as number,
      unit: 'kg',
    }));
}

export function durationTrendPoints(trend: DurationTrendPointDto[]): ChartPoint[] {
  return [...trend]
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((point) => ({
      key: point.workoutSessionId,
      date: point.performedAt,
      label: formatIsoDate(point.performedAt, 'd MMM') ?? point.performedAt,
      value: point.totalDurationSeconds,
      unit: 'sec',
    }));
}

/** Tight Y domain so small body/load changes are visible (not 0–100). */
export function yAxisDomain(points: ChartPoint[]): [number, number] | undefined {
  const values = points
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return undefined;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = min === max ? Math.max(Math.abs(min) * 0.05, 1) : (max - min) * 0.2;
  return [min - pad, max + pad];
}

export function firstLastChange(points: ChartPoint[]): number | null {
  if (points.length < 2) {
    return null;
  }
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || !Number.isFinite(first.value) || !Number.isFinite(last.value)) {
    return null;
  }
  return last.value - first.value;
}
