import { z } from 'zod';
import { clientBodyCopy } from '@/features/client-body/copy';
import { commonCopy } from '@/i18n/locales/common-live';
import { interpolate } from '@/i18n/format';
import {
  BODY_METRIC_FIELDS,
  NOTES_MAX_LENGTH,
  metricBounds,
  type BodyMetricField,
} from '@/features/client-body/lib/metric-fields';

function optionalMetric(field: BodyMetricField) {
  const { min, max } = metricBounds(field);
  return z.string().superRefine((raw, ctx) => {
    const value = raw.trim();
    if (!value) {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: 'custom', message: commonCopy.validation.enterNumber });
      return;
    }
    if (parsed < min || parsed > max) {
      ctx.addIssue({
        code: 'custom',
        message: interpolate(commonCopy.validation.range, { min, max }),
      });
    }
  });
}

export function getMeasurementFormSchema() {
  const metricShape = Object.fromEntries(
    BODY_METRIC_FIELDS.map((field) => [field, optionalMetric(field)]),
  ) as { [K in BodyMetricField]: ReturnType<typeof optionalMetric> };

  return z
    .object({
      ...metricShape,
      measuredAt: z.string(),
      notes: z.string().superRefine((raw, ctx) => {
        if (raw.length > NOTES_MAX_LENGTH) {
          ctx.addIssue({
            code: 'custom',
            message: interpolate(commonCopy.validation.notesMax, { max: NOTES_MAX_LENGTH }),
          });
        }
      }),
    })
    .superRefine((value, ctx) => {
      const hasMetric = BODY_METRIC_FIELDS.some((field) => value[field].trim().length > 0);
      if (!hasMetric) {
        ctx.addIssue({
          code: 'custom',
          path: ['bodyWeightKg'],
          message: clientBodyCopy.measurements.atLeastOne,
        });
      }
    });
}

export const measurementFormSchema = {
  safeParse: (value: unknown) => getMeasurementFormSchema().safeParse(value),
  parse: (value: unknown) => getMeasurementFormSchema().parse(value),
};

export type MeasurementFormValues = z.infer<ReturnType<typeof getMeasurementFormSchema>>;

export function emptyMeasurementFormValues(): MeasurementFormValues {
  return {
    bodyWeightKg: '',
    bodyFatPercentage: '',
    neckCm: '',
    shouldersCm: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    leftArmCm: '',
    rightArmCm: '',
    leftThighCm: '',
    rightThighCm: '',
    leftCalfCm: '',
    rightCalfCm: '',
    measuredAt: '',
    notes: '',
  };
}
