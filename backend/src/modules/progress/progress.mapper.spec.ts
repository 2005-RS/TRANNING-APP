import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { ExerciseStatus } from '../exercises/enums/exercise-status.enum';
import { toListItem, toSummary } from './progress.mapper';

describe('progress.mapper', () => {
  it('maps an empty summary row to zeros and null dates', () => {
    expect(toSummary(undefined)).toEqual({
      completedSessions: 0,
      performedSets: 0,
      exercisesPerformed: 0,
      totalReps: 0,
      externalLoadVolumeKg: 0,
      totalDurationSeconds: 0,
      firstCompletedSessionAt: null,
      lastCompletedSessionAt: null,
    });
  });

  it('does not merge REPS metrics onto DURATION list rows', () => {
    const item = toListItem({
      exercise_id: 'ex-1',
      exercise_name: 'Plank',
      exercise_status: ExerciseStatus.ACTIVE,
      prescription_type: WorkoutPrescriptionType.DURATION,
      completed_sessions: 2,
      performed_sets: 5,
      total_reps: 99,
      external_load_volume_kg: '1000.00',
      best_load_kg: '80.00',
      best_reps: 12,
      best_estimated_1rm_kg: '105.00',
      total_duration_seconds: 245,
      best_duration_seconds: 60,
      first_performed_at: '2026-01-01T00:00:00.000Z',
      last_performed_at: '2026-01-02T00:00:00.000Z',
    });

    expect(item.totalReps).toBeNull();
    expect(item.externalLoadVolumeKg).toBeNull();
    expect(item.bestLoadKg).toBeNull();
    expect(item.bestReps).toBeNull();
    expect(item.bestEstimated1RmKg).toBeNull();
    expect(item.totalDurationSeconds).toBe(245);
    expect(item.bestDurationSeconds).toBe(60);
  });
});
