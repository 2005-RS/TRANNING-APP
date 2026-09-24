import { describe, expect, it } from 'vitest';
import {
  clampExerciseIndex,
  initialExerciseIndex,
  recordedSetCount,
} from '@/features/workout-session/lib/session-helpers';
import { createInProgressSession } from '@/features/workout-session/tests/fixtures';

describe('session helpers', () => {
  it('counts recorded sets across exercises', () => {
    const session = createInProgressSession();
    session.exercises[0]!.sets = [
      {
        id: '00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        setNumber: 1,
        actualReps: 8,
        actualLoadKg: 80,
        actualDurationSeconds: null,
        actualRpe: null,
        actualRir: null,
        notes: null,
      },
    ];
    expect(recordedSetCount(session)).toBe(1);
  });

  it('selects the first incomplete exercise', () => {
    const session = createInProgressSession();
    session.exercises[0]!.sets = Array.from({ length: 4 }, (_, index) => ({
      id: `${String(index + 1).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
      setNumber: index + 1,
      actualReps: 8,
      actualLoadKg: 80,
      actualDurationSeconds: null,
      actualRpe: null,
      actualRir: null,
      notes: null,
    }));
    expect(initialExerciseIndex(session.exercises)).toBe(1);
  });

  it('clamps exercise indexes', () => {
    expect(clampExerciseIndex(9, 2)).toBe(1);
    expect(clampExerciseIndex(-1, 2)).toBe(0);
    expect(clampExerciseIndex(0, 0)).toBe(0);
  });
});
