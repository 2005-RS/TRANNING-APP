import { ExerciseMediaResponseDto } from '../exercises/media/dto/exercise-media-response.dto';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import {
  WorkoutSessionExerciseResponseDto,
  WorkoutSessionResponseDto,
  WorkoutSessionSummaryResponseDto,
  WorkoutSetResponseDto,
} from './dto/workout-session-response.dto';
import { WorkoutSessionExercise } from './entities/workout-session-exercise.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';

export function toWorkoutSessionSummary(
  session: WorkoutSession,
): WorkoutSessionSummaryResponseDto {
  return {
    id: session.id,
    trainingPlanId: session.trainingPlanId,
    sourceTrainingPlanWorkoutId: session.sourceTrainingPlanWorkoutId,
    workoutName: session.workoutNameSnapshot,
    workoutDescription: session.workoutDescriptionSnapshot,
    scheduledDay: session.scheduledDaySnapshot,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    cancelledAt: session.cancelledAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function toWorkoutSessionResponse(
  session: WorkoutSession,
  exercises: WorkoutSessionExercise[] = session.exercises ?? [],
  demonstrationByExerciseId: ReadonlyMap<
    string,
    ExerciseMediaResponseDto
  > = new Map(),
): WorkoutSessionResponseDto {
  const ordered = [...exercises].sort(
    (left, right) => left.position - right.position,
  );

  return {
    ...toWorkoutSessionSummary(session),
    exercises: ordered.map((exercise) =>
      toExerciseResponse(
        exercise,
        demonstrationByExerciseId.get(exercise.exerciseId) ?? null,
      ),
    ),
  };
}

function toExerciseResponse(
  exercise: WorkoutSessionExercise,
  demonstrationMedia: ExerciseMediaResponseDto | null,
): WorkoutSessionExerciseResponseDto {
  const sets = [...(exercise.sets ?? [])].sort(
    (left, right) => left.setNumber - right.setNumber,
  );

  return {
    id: exercise.id,
    sourceTrainingPlanExerciseId: exercise.sourceTrainingPlanExerciseId,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseNameSnapshot,
    position: exercise.position,
    prescription: {
      sets: exercise.prescribedSets,
      type: exercise.prescriptionType as WorkoutPrescriptionType,
      repsMin: exercise.prescribedRepsMin,
      repsMax: exercise.prescribedRepsMax,
      durationSeconds: exercise.prescribedDurationSeconds,
      restSeconds: exercise.prescribedRestSeconds,
      targetLoadKg: toNumber(exercise.prescribedTargetLoadKg),
      targetRpe: toNumber(exercise.prescribedTargetRpe),
      targetRir: exercise.prescribedTargetRir,
      tempo: exercise.prescribedTempo,
      notes: exercise.prescribedNotes,
    },
    sets: sets.map((set) => toSetResponse(set)),
    demonstrationMedia,
  };
}

function toSetResponse(set: WorkoutSet): WorkoutSetResponseDto {
  return {
    id: set.id,
    setNumber: set.setNumber,
    actualReps: set.actualReps,
    actualDurationSeconds: set.actualDurationSeconds,
    actualLoadKg: toNumber(set.actualLoadKg),
    actualRpe: toNumber(set.actualRpe),
    actualRir: set.actualRir,
    notes: set.notes,
  };
}

function toNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}
