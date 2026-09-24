import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { ExerciseMediaStatus } from '../exercises/media/enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../exercises/media/enums/exercise-media-type.enum';
import { WorkoutSessionStatus } from './enums/workout-session-status.enum';
import { WorkoutSession } from './entities/workout-session.entity';
import { toWorkoutSessionResponse } from './workout-sessions.mapper';

describe('toWorkoutSessionResponse', () => {
  it('maps prescribed snapshot separately from actual sets and numeric columns', () => {
    const mapped = toWorkoutSessionResponse({
      id: 'session-1',
      trainingPlanId: 'plan-1',
      sourceTrainingPlanWorkoutId: 'plan-workout-1',
      workoutNameSnapshot: 'Push Day',
      workoutDescriptionSnapshot: 'Upper',
      scheduledDaySnapshot: 'MONDAY',
      status: WorkoutSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-09-02T12:00:00.000Z'),
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-09-02T12:00:00.000Z'),
      updatedAt: new Date('2026-09-02T12:00:00.000Z'),
      exercises: [
        {
          id: 'se-1',
          sourceTrainingPlanExerciseId: 'pe-1',
          exerciseId: 'ex-1',
          exerciseNameSnapshot: 'Barbell Bench Press',
          position: 1,
          prescribedSets: 4,
          prescriptionType: WorkoutPrescriptionType.REPS,
          prescribedRepsMin: 8,
          prescribedRepsMax: 10,
          prescribedDurationSeconds: null,
          prescribedRestSeconds: 120,
          prescribedTargetLoadKg: '80.00' as unknown as number,
          prescribedTargetRpe: null,
          prescribedTargetRir: 2,
          prescribedTempo: null,
          prescribedNotes: null,
          sets: [
            {
              id: 'set-1',
              setNumber: 1,
              actualReps: 10,
              actualDurationSeconds: null,
              actualLoadKg: '80.00' as unknown as number,
              actualRpe: '8.0' as unknown as number,
              actualRir: null,
              notes: null,
            },
          ],
        },
      ],
    } as WorkoutSession);

    expect(mapped.workoutName).toBe('Push Day');
    expect(mapped.exercises[0].exerciseName).toBe('Barbell Bench Press');
    expect(mapped.exercises[0].prescription).toMatchObject({
      sets: 4,
      type: WorkoutPrescriptionType.REPS,
      repsMin: 8,
      repsMax: 10,
      targetLoadKg: 80,
      targetRir: 2,
    });
    expect(mapped.exercises[0].sets[0].actualLoadKg).toBe(80);
    expect(mapped.exercises[0].sets[0].actualRpe).toBe(8);
    expect(mapped.exercises[0].demonstrationMedia).toBeNull();
    expect(JSON.stringify(mapped)).not.toContain('passwordHash');
    expect(JSON.stringify(mapped)).not.toContain('storageKey');
    expect(JSON.stringify(mapped)).not.toContain('workoutNameSnapshot');
  });

  it('attaches READY demonstration metadata without storage keys', () => {
    const mapped = toWorkoutSessionResponse(
      {
        id: 'session-1',
        trainingPlanId: 'plan-1',
        sourceTrainingPlanWorkoutId: 'plan-workout-1',
        workoutNameSnapshot: 'Push Day',
        workoutDescriptionSnapshot: null,
        scheduledDaySnapshot: 'MONDAY',
        status: WorkoutSessionStatus.IN_PROGRESS,
        startedAt: new Date('2026-09-02T12:00:00.000Z'),
        completedAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-09-02T12:00:00.000Z'),
        updatedAt: new Date('2026-09-02T12:00:00.000Z'),
        exercises: [
          {
            id: 'se-1',
            sourceTrainingPlanExerciseId: 'pe-1',
            exerciseId: 'ex-1',
            exerciseNameSnapshot: 'Barbell Bench Press',
            position: 1,
            prescribedSets: 4,
            prescriptionType: WorkoutPrescriptionType.REPS,
            prescribedRepsMin: 8,
            prescribedRepsMax: 10,
            prescribedDurationSeconds: null,
            prescribedRestSeconds: 120,
            prescribedTargetLoadKg: null,
            prescribedTargetRpe: null,
            prescribedTargetRir: null,
            prescribedTempo: null,
            prescribedNotes: null,
            sets: [],
          },
        ],
      } as unknown as WorkoutSession,
      undefined,
      new Map([
        [
          'ex-1',
          {
            id: 'media-1',
            mediaType: ExerciseMediaType.VIDEO,
            originalFileName: 'bench.mp4',
            mimeType: 'video/mp4',
            fileSizeBytes: 1024,
            status: ExerciseMediaStatus.READY,
            displayOrder: 0,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            finalizedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      ]),
    );

    expect(mapped.exercises[0].demonstrationMedia?.id).toBe('media-1');
    expect(JSON.stringify(mapped)).not.toContain('storageKey');
  });
});
