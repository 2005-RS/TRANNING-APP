import type {
  TrainingPlanResponseDto,
  WorkoutSessionExerciseResponseDto,
  WorkoutSessionResponseDto,
  WorkoutSetInputDto,
} from '@/generated/models';
import {
  TrainingPlanExerciseResponseDtoPrescriptionType,
  TrainingPlanResponseDtoStatus,
  TrainingPlanWorkoutResponseDtoScheduledDay,
  WorkoutSessionPrescriptionResponseDtoType,
  WorkoutSessionResponseDtoStatus,
} from '@/generated/models';

export const PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const LOWER_WORKOUT_ID = '11111111-aaaa-4111-8111-111111111111';
export const UPPER_WORKOUT_ID = '22222222-aaaa-4111-8111-222222222222';
export const SESSION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const STARTED_SESSION_ID = '55555555-bbbb-4bbb-8bbb-555555555555';
export const FOREIGN_SESSION_ID = '66666666-cccc-4ccc-8ccc-666666666666';
export const SQUAT_SESSION_EXERCISE_ID = 'e1111111-e111-4111-8111-e11111111111';
export const PLANK_SESSION_EXERCISE_ID = 'e2222222-e222-4222-8222-e22222222222';
export const SQUAT_EXERCISE_ID = '77777777-dddd-4ddd-8ddd-777777777777';
export const PLANK_EXERCISE_ID = '88888888-dddd-4ddd-8ddd-888888888888';

const timestamps = {
  startedAt: '2026-09-04T14:05:00.000Z',
  createdAt: '2026-09-04T14:05:00.000Z',
  updatedAt: '2026-09-04T14:05:00.000Z',
};

export const squatExercise: WorkoutSessionExerciseResponseDto = {
  id: SQUAT_SESSION_EXERCISE_ID,
  sourceTrainingPlanExerciseId: '33333333-aaaa-4111-8111-333333333333',
  exerciseId: SQUAT_EXERCISE_ID,
  exerciseName: 'Back squat',
  position: 1,
  prescription: {
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
  },
  demonstrationMedia: null,
  sets: [],
};

export const plankExercise: WorkoutSessionExerciseResponseDto = {
  id: PLANK_SESSION_EXERCISE_ID,
  sourceTrainingPlanExerciseId: '44444444-aaaa-4111-8111-444444444444',
  exerciseId: PLANK_EXERCISE_ID,
  exerciseName: 'Plank',
  position: 2,
  prescription: {
    sets: 3,
    type: WorkoutSessionPrescriptionResponseDtoType.DURATION,
    repsMin: null,
    repsMax: null,
    durationSeconds: 45,
    restSeconds: 60,
    targetLoadKg: 0,
    targetRpe: null,
    targetRir: null,
    tempo: null,
    notes: null,
  },
  demonstrationMedia: null,
  sets: [],
};

export function createInProgressSession(
  overrides: Partial<WorkoutSessionResponseDto> = {},
): WorkoutSessionResponseDto {
  return {
    id: SESSION_ID,
    trainingPlanId: PLAN_ID,
    sourceTrainingPlanWorkoutId: LOWER_WORKOUT_ID,
    workoutName: 'Lower A',
    workoutDescription: null,
    scheduledDay: 'MONDAY',
    status: WorkoutSessionResponseDtoStatus.IN_PROGRESS,
    startedAt: timestamps.startedAt,
    completedAt: null,
    cancelledAt: null,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    exercises: [
      structuredClone(squatExercise),
      structuredClone(plankExercise),
    ],
    ...overrides,
  };
}

export const inProgressSession = createInProgressSession();

export const currentTrainingPlan: TrainingPlanResponseDto = {
  id: PLAN_ID,
  name: 'Hypertrophy block 4',
  description: null,
  status: TrainingPlanResponseDtoStatus.ACTIVE,
  startDate: '2026-09-01',
  endDate: '2026-10-12',
  clientProfileId: 'c1111111-c111-4111-8111-c11111111111',
  createdByUserId: 't1111111-t111-4111-8111-t11111111111',
  activatedAt: '2026-09-01T08:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  workouts: [
    {
      id: LOWER_WORKOUT_ID,
      sourceWorkoutTemplateId: '90000000-aaaa-4111-8111-900000000001',
      name: 'Lower A',
      description: null,
      position: 1,
      scheduledDay: TrainingPlanWorkoutResponseDtoScheduledDay.MONDAY,
      notes: null,
      exercises: [
        {
          id: '33333333-aaaa-4111-8111-333333333333',
          exerciseId: SQUAT_EXERCISE_ID,
          exerciseName: 'Back squat',
          position: 1,
          sets: 4,
          prescriptionType: TrainingPlanExerciseResponseDtoPrescriptionType.REPS,
          repsMin: 8,
          repsMax: 10,
          durationSeconds: null,
          restSeconds: 90,
          targetLoadKg: 80,
          targetRpe: null,
          targetRir: null,
          tempo: null,
          notes: null,
        },
        {
          id: '44444444-aaaa-4111-8111-444444444444',
          exerciseId: PLANK_EXERCISE_ID,
          exerciseName: 'Plank',
          position: 2,
          sets: 3,
          prescriptionType: TrainingPlanExerciseResponseDtoPrescriptionType.DURATION,
          repsMin: null,
          repsMax: null,
          durationSeconds: 45,
          restSeconds: 60,
          targetLoadKg: 0,
          targetRpe: null,
          targetRir: null,
          tempo: null,
          notes: null,
        },
      ],
    },
    {
      id: UPPER_WORKOUT_ID,
      sourceWorkoutTemplateId: '90000000-aaaa-4111-8111-900000000002',
      name: 'Upper A',
      description: null,
      position: 2,
      scheduledDay: TrainingPlanWorkoutResponseDtoScheduledDay.TUESDAY,
      notes: null,
      exercises: [
        {
          id: '33333333-bbbb-4111-8111-333333333333',
          exerciseId: SQUAT_EXERCISE_ID,
          exerciseName: 'Bench press',
          position: 1,
          sets: 4,
          prescriptionType: TrainingPlanExerciseResponseDtoPrescriptionType.REPS,
          repsMin: 6,
          repsMax: 8,
          durationSeconds: null,
          restSeconds: 120,
          targetLoadKg: 60,
          targetRpe: null,
          targetRir: null,
          tempo: null,
          notes: null,
        },
      ],
    },
  ],
};

export function sessionFromPlanWorkout(
  workoutId: string,
  sessionId = STARTED_SESSION_ID,
): WorkoutSessionResponseDto | null {
  const workout = currentTrainingPlan.workouts.find((item) => item.id === workoutId);
  if (!workout) {
    return null;
  }

  return {
    id: sessionId,
    trainingPlanId: currentTrainingPlan.id,
    sourceTrainingPlanWorkoutId: workout.id,
    workoutName: workout.name,
    workoutDescription: workout.description ?? null,
    scheduledDay: workout.scheduledDay ?? null,
    status: WorkoutSessionResponseDtoStatus.IN_PROGRESS,
    startedAt: timestamps.startedAt,
    completedAt: null,
    cancelledAt: null,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    exercises: workout.exercises.map((exercise, index) => ({
      id: index === 0 ? SQUAT_SESSION_EXERCISE_ID : PLANK_SESSION_EXERCISE_ID,
      sourceTrainingPlanExerciseId: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      position: exercise.position,
      prescription: {
        sets: exercise.sets,
        type: exercise.prescriptionType,
        repsMin: exercise.repsMin,
        repsMax: exercise.repsMax,
        durationSeconds: exercise.durationSeconds,
        restSeconds: exercise.restSeconds,
        targetLoadKg: exercise.targetLoadKg,
        targetRpe: exercise.targetRpe,
        targetRir: exercise.targetRir,
        tempo: exercise.tempo,
        notes: exercise.notes,
      },
      sets: [],
    })),
  };
}

export function applySets(
  session: WorkoutSessionResponseDto,
  sessionExerciseId: string,
  sets: WorkoutSetInputDto[],
): WorkoutSessionResponseDto {
  return {
    ...session,
    updatedAt: '2026-09-04T14:20:00.000Z',
    exercises: session.exercises.map((exercise) => {
      if (exercise.id !== sessionExerciseId) {
        return exercise;
      }
      return {
        ...exercise,
        sets: sets.map((input, index) => ({
          id: `${String(index + 1).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
          setNumber: index + 1,
          actualReps: asNumber(input.actualReps),
          actualDurationSeconds: asNumber(input.actualDurationSeconds),
          actualLoadKg: asNumber(input.actualLoadKg),
          actualRpe: asNumber(input.actualRpe),
          actualRir: asNumber(input.actualRir),
          notes: typeof input.notes === 'string' ? input.notes : null,
        })),
      };
    }),
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
