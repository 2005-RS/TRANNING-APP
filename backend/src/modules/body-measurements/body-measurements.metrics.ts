import {
  BodyMetricField,
  BODY_METRIC_FIELDS,
} from './body-measurements.constants';

export type BodyMetricValues = Record<BodyMetricField, number | null>;

export function hasAtLeastOneMetric(
  values: Partial<Record<BodyMetricField, number | null | undefined>>,
): boolean {
  return BODY_METRIC_FIELDS.some((field) => {
    const value = values[field];
    return typeof value === 'number' && Number.isFinite(value);
  });
}

export function emptyMetricValues(): BodyMetricValues {
  return {
    bodyWeightKg: null,
    bodyFatPercentage: null,
    neckCm: null,
    shouldersCm: null,
    chestCm: null,
    waistCm: null,
    hipsCm: null,
    leftArmCm: null,
    rightArmCm: null,
    leftThighCm: null,
    rightThighCm: null,
    leftCalfCm: null,
    rightCalfCm: null,
  };
}

export function toNullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}
