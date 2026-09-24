import { describe, expect, it } from 'vitest';
import {
  formatPrescription,
  formatRestRemaining,
  formatScheduledDay,
} from '@/features/workout-session/lib/formatters';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';

describe('workout formatters', () => {
  it('formats rest remaining as m:ss', () => {
    expect(formatRestRemaining(90)).toBe('1:30');
    expect(formatRestRemaining(8)).toBe('0:08');
    expect(formatRestRemaining(0)).toBe('0:00');
  });

  it('formats known scheduled days and ignores unknown values', () => {
    expect(formatScheduledDay('MONDAY')).toBe('Monday');
    expect(formatScheduledDay(null)).toBeNull();
    expect(formatScheduledDay('not-a-day')).toBeNull();
  });

  it('formats a reps prescription from contract fields only', () => {
    expect(
      formatPrescription({
        sets: 4,
        type: WorkoutSessionPrescriptionResponseDtoType.REPS,
        repsMin: 8,
        repsMax: 10,
        durationSeconds: null,
        restSeconds: 90,
        targetLoadKg: 80,
        targetRpe: null,
        targetRir: null,
        tempo: null,
        notes: null,
      }),
    ).toBe('4 sets · 8–10 reps · 80 kg · 90s rest');
  });
});
