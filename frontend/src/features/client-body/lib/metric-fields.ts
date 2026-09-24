export const BODY_METRIC_FIELDS = [
  'bodyWeightKg',
  'bodyFatPercentage',
  'neckCm',
  'shouldersCm',
  'chestCm',
  'waistCm',
  'hipsCm',
  'leftArmCm',
  'rightArmCm',
  'leftThighCm',
  'rightThighCm',
  'leftCalfCm',
  'rightCalfCm',
] as const;

export type BodyMetricField = (typeof BODY_METRIC_FIELDS)[number];

export const WEIGHT_MIN = 0.01;
export const WEIGHT_MAX = 500;
export const FAT_MIN = 0.01;
export const FAT_MAX = 100;
export const CM_MIN = 0.01;
export const CM_MAX = 500;
export const NOTES_MAX_LENGTH = 1000;

export function metricBounds(field: BodyMetricField): { min: number; max: number } {
  if (field === 'bodyWeightKg') {
    return { min: WEIGHT_MIN, max: WEIGHT_MAX };
  }
  if (field === 'bodyFatPercentage') {
    return { min: FAT_MIN, max: FAT_MAX };
  }
  return { min: CM_MIN, max: CM_MAX };
}

export function metricUnit(field: BodyMetricField): 'kg' | 'cm' | '%' {
  if (field === 'bodyWeightKg') {
    return 'kg';
  }
  if (field === 'bodyFatPercentage') {
    return '%';
  }
  return 'cm';
}
