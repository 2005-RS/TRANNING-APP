import { describe, expect, it } from 'vitest';
import { sessionSummary } from '@/features/workout-session/lib/session-summary';
import { createInProgressSession } from '@/features/workout-session/tests/fixtures';

describe('sessionSummary', () => {
  it('calculates duration, set count and volume', () => {
    const session = createInProgressSession({
      completedAt: '2026-09-04T14:06:00.000Z',
    });
    session.exercises[0]!.sets = [
      {
        id: '1',
        setNumber: 1,
        actualLoadKg: 80,
        actualReps: 8,
        actualDurationSeconds: null,
        actualRpe: null,
        actualRir: null,
        notes: null,
      },
    ];
    expect(sessionSummary(session)).toMatchObject({
      durationSeconds: 60,
      totalSets: 1,
      totalVolume: 640,
      exercisesDone: 1,
    });
  });
});
