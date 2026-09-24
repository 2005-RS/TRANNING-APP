import { describe, expect, it } from 'vitest';
import { appendSetPayload, createSetDraft } from '@/features/workout-session/lib/set-payload';
import { squatExercise } from '@/features/workout-session/tests/fixtures';

describe('set payload', () => {
  it('prefills from prescription targets when no sets exist', () => {
    expect(createSetDraft(squatExercise)).toEqual({
      actualLoadKg: 80,
      actualReps: 8,
      actualDurationSeconds: 0,
    });
  });

  it('sends decimal kilograms through the set input boundary without rounding', () => {
    const payload = appendSetPayload(squatExercise, {
      actualLoadKg: 62.5,
      actualReps: 5,
      actualDurationSeconds: 0,
    });
    expect(payload).toEqual([
      {
        actualReps: 5,
        actualLoadKg: 62.5,
      },
    ]);
  });
});
