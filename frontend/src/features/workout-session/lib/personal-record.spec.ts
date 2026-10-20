import { describe, expect, it } from 'vitest';
import { isPersonalRecord } from '@/features/workout-session/lib/personal-record';

describe('isPersonalRecord', () => {
  const previous = [{ setNumber: 1, actualLoadKg: 60, actualReps: 10, actualDurationSeconds: null }];
  it('recognises a load or rep improvement over a prior session', () => {
    expect(isPersonalRecord({ actualLoadKg: 62.5, actualReps: 8 }, previous)).toBe(true);
    expect(isPersonalRecord({ actualLoadKg: 60, actualReps: 11 }, previous)).toBe(true);
    expect(isPersonalRecord({ actualLoadKg: 50, actualReps: 10 }, previous)).toBe(false);
  });
});
