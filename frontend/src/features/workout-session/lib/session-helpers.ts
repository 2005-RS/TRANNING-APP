import type {
  WorkoutSessionExerciseResponseDto,
  WorkoutSessionResponseDto,
} from '@/generated/models';
import { WorkoutSessionResponseDtoStatus } from '@/generated/models';

export function recordedSetCount(session: WorkoutSessionResponseDto): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

export function isSessionInProgress(session: WorkoutSessionResponseDto): boolean {
  return session.status === WorkoutSessionResponseDtoStatus.IN_PROGRESS;
}

export function initialExerciseIndex(
  exercises: WorkoutSessionExerciseResponseDto[],
): number {
  if (exercises.length === 0) {
    return 0;
  }

  const incomplete = exercises.findIndex(
    (exercise) => exercise.sets.length < exercise.prescription.sets,
  );
  return incomplete >= 0 ? incomplete : exercises.length - 1;
}

export function clampExerciseIndex(
  index: number,
  exerciseCount: number,
): number {
  if (exerciseCount <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), exerciseCount - 1);
}
