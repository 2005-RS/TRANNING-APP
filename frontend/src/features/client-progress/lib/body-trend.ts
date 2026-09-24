import type { BodyMeasurementResponseDto } from '@/generated/models/bodyMeasurementResponseDto';
import { absoluteChange } from '@/features/client-progress/lib/percent-change';

export type BodyTrendSummary = {
  latest: BodyMeasurementResponseDto | null;
  earliestWeight: number | null;
  latestWeight: number | null;
  weightChangeKg: number | null;
  latestWaistCm: number | null;
  earliestWaistCm: number | null;
  waistChangeCm: number | null;
  measurementCount: number;
};

export function summarizeBodyTrend(
  measurements: BodyMeasurementResponseDto[],
): BodyTrendSummary {
  const chronological = [...measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  const latest = chronological[chronological.length - 1] ?? null;
  const withWeight = chronological.filter(
    (row) => row.bodyWeightKg != null && Number.isFinite(row.bodyWeightKg),
  );
  const withWaist = chronological.filter(
    (row) => row.waistCm != null && Number.isFinite(row.waistCm),
  );
  const earliestWeight = withWeight[0]?.bodyWeightKg ?? null;
  const latestWeight = withWeight[withWeight.length - 1]?.bodyWeightKg ?? null;
  const earliestWaistCm = withWaist[0]?.waistCm ?? null;
  const latestWaistCm = withWaist[withWaist.length - 1]?.waistCm ?? null;

  return {
    latest,
    earliestWeight,
    latestWeight,
    weightChangeKg: absoluteChange(latestWeight, earliestWeight),
    latestWaistCm,
    earliestWaistCm,
    waistChangeCm: absoluteChange(latestWaistCm, earliestWaistCm),
    measurementCount: measurements.length,
  };
}

export function factualWeightCopy(
  changeKg: number | null,
  fromDate: string | null,
  toDate: string | null,
): string | null {
  if (changeKg == null) {
    return null;
  }
  const range =
    fromDate && toDate && fromDate !== toDate ? ` from ${fromDate} to ${toDate}` : '';
  if (changeKg === 0) {
    return `Body weight is unchanged${range}.`;
  }
  const direction = changeKg > 0 ? 'higher' : 'lower';
  return `Latest body weight is ${direction} than the first measurement in this period${range}.`;
}
