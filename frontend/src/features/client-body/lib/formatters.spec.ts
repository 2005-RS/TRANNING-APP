import { describe, expect, it } from 'vitest';
import { finiteNumber } from '@/features/client-body/lib/finite-number';
import { formatBodyAmount, formatCm, formatKg } from '@/features/client-body/lib/formatters';
import { formValuesToCreatePayload } from '@/features/client-body/lib/measurement-payload';
import { emptyMeasurementFormValues } from '@/features/client-body/schemas/measurement-form-schema';
import { isAllowedProgressPhotoMime } from '@/features/client-body/lib/photo-mime';

describe('finiteNumber', () => {
  it('keeps zero and decimals, and treats non-finite as absence', () => {
    expect(finiteNumber(0)).toBe(0);
    expect(finiteNumber(81.25)).toBe(81.25);
    expect(finiteNumber(null)).toBeNull();
    expect(finiteNumber(Number.NaN)).toBeNull();
  });
});

describe('body formatters', () => {
  it('preserves 81.25 kg and 81.2 cm', () => {
    expect(formatKg(81.25)).toBe('81.25 kg');
    expect(formatCm(81.2)).toBe('81.2 cm');
    expect(formatBodyAmount(0)).toBe('0');
    expect(formatKg(null)).toBeNull();
  });
});

describe('measurement payload', () => {
  it('omits empty metrics and keeps decimals', () => {
    const values = emptyMeasurementFormValues();
    values.bodyWeightKg = '81.25';
    values.waistCm = '81.2';
    const payload = formValuesToCreatePayload(values);
    expect(payload.bodyWeightKg).toBe(81.25);
    expect(payload.waistCm).toBe(81.2);
    expect(payload.bodyFatPercentage).toBeUndefined();
  });
});

describe('photo mime', () => {
  it('allowlists jpeg png webp only', () => {
    expect(isAllowedProgressPhotoMime('image/jpeg')).toBe(true);
    expect(isAllowedProgressPhotoMime('image/svg+xml')).toBe(false);
  });
});
