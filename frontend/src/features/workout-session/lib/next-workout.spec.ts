import { describe, expect, it } from 'vitest';
import {
  LOWER_WORKOUT_ID,
  SESSION_ID,
  currentTrainingPlan,
} from '@/features/workout-session/tests/fixtures';
import { nextWorkout } from '@/features/workout-session/lib/next-workout';

// Sunday 2026-10-11: no fixture workout is scheduled on Sundays, so rotation rules apply.
const NO_SCHEDULED_DAY = new Date(2026, 9, 11, 12);

describe('nextWorkout', () => {
  it('prefers the workout scheduled for today', () => {
    const result = nextWorkout(currentTrainingPlan.workouts, [], new Date('2026-09-07T12:00:00'));

    expect(result?.id).toBe(LOWER_WORKOUT_ID);
  });

  it('rotates after the last completed workout', () => {
    const result = nextWorkout(currentTrainingPlan.workouts, [
      { sourceTrainingPlanWorkoutId: LOWER_WORKOUT_ID },
    ], NO_SCHEDULED_DAY);

    expect(result?.id).toBe(currentTrainingPlan.workouts[1]?.id);
  });

  it('falls back to the first workout', () => {
    const result = nextWorkout(currentTrainingPlan.workouts, [
      { sourceTrainingPlanWorkoutId: SESSION_ID },
    ], NO_SCHEDULED_DAY);

    expect(result?.id).toBe(LOWER_WORKOUT_ID);
  });
});
