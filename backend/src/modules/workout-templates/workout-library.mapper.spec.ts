import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';
import { toWorkoutLibraryItem } from './workout-library.mapper';

describe('toWorkoutLibraryItem', () => {
  it('maps exercises and rounds the estimated duration up, using duration prescriptions', () => {
    const item = toWorkoutLibraryItem({
      id: 'template-1',
      name: 'Starter circuit',
      description: 'A concise session',
      items: [
        {
          position: 2,
          exerciseId: 'exercise-duration',
          exercise: { name: 'Plank' },
          sets: 2,
          prescriptionType: WorkoutPrescriptionType.DURATION,
          repsMin: null,
          repsMax: null,
          durationSeconds: 90,
          restSeconds: 30,
        },
        {
          position: 1,
          exerciseId: 'exercise-reps',
          exercise: { name: 'Squat' },
          sets: 3,
          prescriptionType: WorkoutPrescriptionType.REPS,
          repsMin: 8,
          repsMax: 12,
          durationSeconds: null,
          restSeconds: 60,
        },
      ],
    } as never);

    expect(item).toMatchObject({
      id: 'template-1',
      exerciseCount: 2,
      estimatedMinutes: 10,
      exercises: [
        {
          exerciseId: 'exercise-reps',
          name: 'Squat',
          sets: 3,
          prescriptionType: WorkoutPrescriptionType.REPS,
          repsMin: 8,
          repsMax: 12,
          durationSeconds: null,
          restSeconds: 60,
        },
        {
          exerciseId: 'exercise-duration',
          name: 'Plank',
          sets: 2,
          prescriptionType: WorkoutPrescriptionType.DURATION,
          durationSeconds: 90,
          restSeconds: 30,
        },
      ],
    });
  });
});
