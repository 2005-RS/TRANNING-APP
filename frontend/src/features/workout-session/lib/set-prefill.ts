import type { WorkoutPreviousSetDto, WorkoutSessionExerciseResponseDto } from '@/generated/models';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';
import type { SetDraft } from '@/features/workout-session/lib/set-payload';

function valid(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function prefillSetDraft(
  exercise: WorkoutSessionExerciseResponseDto,
  setNumber: number,
): SetDraft {
  const recorded = exercise.sets.find((set) => set.setNumber === setNumber);
  const previous: WorkoutPreviousSetDto | undefined = exercise.previousSets.find(
    (set) => set.setNumber === setNumber,
  );
  const prescription = exercise.prescription;
  return {
    actualLoadKg: valid(recorded?.actualLoadKg) ?? valid(previous?.actualLoadKg) ?? valid(prescription.targetLoadKg),
    actualReps: valid(recorded?.actualReps) ?? valid(previous?.actualReps) ?? valid(prescription.repsMin),
    actualDurationSeconds:
      valid(recorded?.actualDurationSeconds) ??
      valid(previous?.actualDurationSeconds) ??
      valid(prescription.durationSeconds),
  };
}

export function setValueLabel(exercise: WorkoutSessionExerciseResponseDto, setNumber: number): string {
  const previous = exercise.previousSets.find((set) => set.setNumber === setNumber);
  if (!previous) return '—';
  const value = exercise.prescription.type === WorkoutSessionPrescriptionResponseDtoType.DURATION
    ? previous.actualDurationSeconds
    : previous.actualReps;
  return value == null ? '—' : `${previous.actualLoadKg ?? 0} × ${value}`;
}
