import { describe, expect, it } from 'vitest';
import { finiteNumber } from '@/features/client-check-ins/lib/finite-number';
import { formatAdherencePct, formatRating } from '@/features/client-check-ins/lib/formatters';
import { periodSpanDays } from '@/features/client-check-ins/lib/period';
import {
  formValuesToUpdatePayload,
  hasSubstantiveResponse,
} from '@/features/client-check-ins/lib/payload';
import { draftCheckIn } from '@/features/client-check-ins/tests/fixtures';
import { checkInToFormValues } from '@/features/client-check-ins/lib/payload';
import { checkInStatusLabel } from '@/features/client-check-ins/lib/status';
import { CheckInResponseDtoStatus } from '@/generated/models';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';

describe('finiteNumber', () => {
  it('keeps zero and decimals, and treats non-finite as absence', () => {
    expect(finiteNumber(0)).toBe(0);
    expect(finiteNumber(62.5)).toBe(62.5);
    expect(finiteNumber(null)).toBeNull();
    expect(finiteNumber(undefined)).toBeNull();
    expect(finiteNumber(Number.NaN)).toBeNull();
    expect(finiteNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('period span', () => {
  it('allows a 31-day difference and rejects longer', () => {
    expect(periodSpanDays('2026-01-01', '2026-02-01')).toBe(31);
    expect(periodSpanDays('2026-01-01', '2026-02-02')).toBe(32);
    expect(periodSpanDays('2026-08-25', '2026-08-24')).toBe(-1);
  });
});

describe('payload', () => {
  it('preserves draft values including 0 and 62.5', () => {
    const values = checkInToFormValues(draftCheckIn);
    expect(values.sleepQuality).toBe(4);
    expect(values.stressLevel).toBeNull();
    expect(values.trainingAdherencePct).toBe('80');
    expect(values.wins).toBe('Hit every session.');

    values.trainingAdherencePct = '0';
    values.nutritionAdherencePct = '62.5';
    values.sleepQuality = null;
    const payload = formValuesToUpdatePayload(values);
    expect(payload.trainingAdherencePct).toBe(0);
    expect(payload.nutritionAdherencePct).toBe(62.5);
    expect(payload.sleepQuality).toBeNull();
    expect(hasSubstantiveResponse(values)).toBe(true);
  });

  it('treats empty responses as not substantive', () => {
    const values = checkInToFormValues(draftCheckIn);
    values.sleepQuality = null;
    values.energyLevel = null;
    values.recoveryLevel = null;
    values.trainingAdherencePct = '';
    values.nutritionAdherencePct = '';
    values.wins = '   ';
    values.challenges = '';
    values.generalNotes = '';
    expect(hasSubstantiveResponse(values)).toBe(false);
  });
});

describe('status labels', () => {
  it('uses backend status, not inferred review text', () => {
    expect(checkInStatusLabel(CheckInResponseDtoStatus.DRAFT)).toBe(clientCheckInsCopy.status.draft);
    expect(checkInStatusLabel(CheckInResponseDtoStatus.SUBMITTED)).toBe(
      clientCheckInsCopy.status.waitingReview,
    );
    expect(checkInStatusLabel(CheckInResponseDtoStatus.REVIEWED)).toBe(
      clientCheckInsCopy.status.reviewed,
    );
  });
});

describe('formatters', () => {
  it('does not turn 0 into missing', () => {
    expect(formatAdherencePct(0)).toBe('0%');
    expect(formatAdherencePct(62.5)).toBe('62.5%');
    expect(formatAdherencePct(null)).toBeNull();
    expect(formatRating(0)).toBe('0');
    expect(formatRating(4)).toBe('4');
    expect(formatRating(null)).toBeNull();
  });
});
