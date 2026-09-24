import type {
  WorkoutSessionExerciseResponseDto,
  WorkoutSetInputDto,
  WorkoutSetResponseDto,
} from '@/generated/models';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';
import {
  finiteOrZero,
  normalizeNullableNumber,
} from '@/features/workout-session/lib/nullable-number';

export type SetDraft = {
  actualLoadKg: number;
  actualReps: number;
  actualDurationSeconds: number;
};

/**
 * Generated input DTOs type nullable numbers as `{ [key: string]: unknown } | null`.
 * Values are runtime-checked first; the assertion is only the Orval boundary.
 */
function toSetInputNumber(value: unknown): WorkoutSetInputDto['actualReps'] {
  return normalizeNullableNumber(value) as WorkoutSetInputDto['actualReps'];
}

export function createSetDraft(
  exercise: WorkoutSessionExerciseResponseDto,
): SetDraft {
  const last = exercise.sets.at(-1);
  const prescription = exercise.prescription;

  return {
    actualLoadKg: finiteOrZero(last?.actualLoadKg ?? prescription.targetLoadKg),
    actualReps: finiteOrZero(last?.actualReps ?? prescription.repsMin),
    actualDurationSeconds: finiteOrZero(
      last?.actualDurationSeconds ?? prescription.durationSeconds,
    ),
  };
}

export function toSetInput(
  draft: SetDraft,
  type: WorkoutSessionExerciseResponseDto['prescription']['type'],
): WorkoutSetInputDto {
  const load = toSetInputNumber(Math.max(0, draft.actualLoadKg));

  if (type === WorkoutSessionPrescriptionResponseDtoType.DURATION) {
    return {
      actualDurationSeconds: toSetInputNumber(
        Math.max(0, Math.round(draft.actualDurationSeconds)),
      ),
      actualLoadKg: load,
    };
  }

  return {
    actualReps: toSetInputNumber(Math.max(0, Math.round(draft.actualReps))),
    actualLoadKg: load,
  };
}

export function recordedSetToInput(
  set: WorkoutSetResponseDto,
  type: WorkoutSessionExerciseResponseDto['prescription']['type'],
): WorkoutSetInputDto {
  if (type === WorkoutSessionPrescriptionResponseDtoType.DURATION) {
    return {
      actualDurationSeconds: toSetInputNumber(finiteOrZero(set.actualDurationSeconds)),
      actualLoadKg: toSetInputNumber(finiteOrZero(set.actualLoadKg)),
      actualRpe:
        set.actualRpe == null ? undefined : toSetInputNumber(set.actualRpe),
      actualRir:
        set.actualRir == null ? undefined : toSetInputNumber(set.actualRir),
    };
  }

  return {
    actualReps: toSetInputNumber(finiteOrZero(set.actualReps)),
    actualLoadKg: toSetInputNumber(finiteOrZero(set.actualLoadKg)),
    actualRpe: set.actualRpe == null ? undefined : toSetInputNumber(set.actualRpe),
    actualRir: set.actualRir == null ? undefined : toSetInputNumber(set.actualRir),
  };
}

export function appendSetPayload(
  exercise: WorkoutSessionExerciseResponseDto,
  draft: SetDraft,
): WorkoutSetInputDto[] {
  const type = exercise.prescription.type;
  return [
    ...exercise.sets.map((set) => recordedSetToInput(set, type)),
    toSetInput(draft, type),
  ];
}

export function withoutLastSetPayload(
  exercise: WorkoutSessionExerciseResponseDto,
): WorkoutSetInputDto[] {
  const type = exercise.prescription.type;
  return exercise.sets.slice(0, -1).map((set) => recordedSetToInput(set, type));
}

export function stepValue(value: number, delta: number, min = 0): number {
  const next = Math.round((value + delta) * 10) / 10;
  return Math.max(min, next);
}
