import type { BodyMeasurementResponseDto } from '@/generated/models';
import { BODY_METRIC_FIELDS } from '@/features/client-body/lib/metric-fields';
import { formatBodyAmount } from '@/features/client-body/lib/formatters';
import { toDatetimeLocalValue } from '@/features/client-body/lib/formatters';
import {
  emptyMeasurementFormValues,
  type MeasurementFormValues,
} from '@/features/client-body/schemas/measurement-form-schema';

export function measurementToFormValues(
  measurement: BodyMeasurementResponseDto,
): MeasurementFormValues {
  const values = emptyMeasurementFormValues();
  for (const field of BODY_METRIC_FIELDS) {
    const formatted = formatBodyAmount(measurement[field] ?? null);
    values[field] = formatted ?? '';
  }
  values.measuredAt = toDatetimeLocalValue(measurement.measuredAt);
  values.notes = measurement.notes ?? '';
  return values;
}

function parseMetric(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formValuesToCreatePayload(values: MeasurementFormValues) {
  const payload: Record<string, number | string> = {};
  for (const field of BODY_METRIC_FIELDS) {
    const parsed = parseMetric(values[field]);
    if (parsed !== undefined) {
      payload[field] = parsed;
    }
  }
  const measuredAt = values.measuredAt.trim();
  if (measuredAt) {
    const iso = new Date(measuredAt).toISOString();
    if (!Number.isNaN(new Date(measuredAt).getTime())) {
      payload.measuredAt = iso;
    }
  }
  const notes = values.notes.trim();
  if (notes) {
    payload.notes = notes;
  }
  return payload;
}

export function formValuesToUpdatePayload(values: MeasurementFormValues) {
  const payload: Record<string, number | string | null> = {};
  for (const field of BODY_METRIC_FIELDS) {
    const parsed = parseMetric(values[field]);
    payload[field] = parsed === undefined ? null : parsed;
  }
  const measuredAt = values.measuredAt.trim();
  if (measuredAt && !Number.isNaN(new Date(measuredAt).getTime())) {
    payload.measuredAt = new Date(measuredAt).toISOString();
  }
  const notes = values.notes.trim();
  payload.notes = notes.length > 0 ? notes : null;
  return payload;
}
