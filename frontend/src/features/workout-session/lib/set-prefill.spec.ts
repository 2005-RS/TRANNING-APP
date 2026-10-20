import { describe, expect, it } from 'vitest';
import { prefillSetDraft } from '@/features/workout-session/lib/set-prefill';
import { squatExercise } from '@/features/workout-session/tests/fixtures';

describe('prefillSetDraft', () => {
  it('prefers prior performance and does not invent a zero load', () => {
    const exercise = structuredClone(squatExercise);
    exercise.previousSets = [{ setNumber: 1, actualLoadKg: 62.5, actualReps: 10, actualDurationSeconds: null }];
    expect(prefillSetDraft(exercise, 1)).toMatchObject({ actualLoadKg: 62.5, actualReps: 10 });
  });
});
