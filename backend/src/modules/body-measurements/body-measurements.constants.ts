export const BODY_MEASUREMENT_LIST_DEFAULT_PAGE = 1;
export const BODY_MEASUREMENT_LIST_DEFAULT_LIMIT = 20;
export const BODY_MEASUREMENT_LIST_MAX_LIMIT = 100;
export const BODY_MEASUREMENT_NOTES_MAX_LENGTH = 1_000;
export const BODY_MEASUREMENT_WEIGHT_MIN = 0.01;
export const BODY_MEASUREMENT_WEIGHT_MAX = 500;
export const BODY_MEASUREMENT_FAT_MIN = 0.01;
export const BODY_MEASUREMENT_FAT_MAX = 100;
export const BODY_MEASUREMENT_CIRCUMFERENCE_MIN = 0.01;
export const BODY_MEASUREMENT_CIRCUMFERENCE_MAX = 500;
export const BODY_MEASUREMENT_FUTURE_SKEW_MS = 5 * 60 * 1000;

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
