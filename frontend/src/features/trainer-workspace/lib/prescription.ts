import {
  WorkoutTemplateExerciseInputDtoPrescriptionType,
  type WorkoutTemplateExerciseInputDto,
  type WorkoutTemplateExerciseInputDtoDurationSeconds,
  type WorkoutTemplateExerciseInputDtoNotes,
  type WorkoutTemplateExerciseInputDtoRepsMax,
  type WorkoutTemplateExerciseInputDtoRepsMin,
  type WorkoutTemplateExerciseInputDtoTargetRpe,
  type WorkoutTemplateExerciseInputDtoTargetRir,
  type WorkoutTemplateExerciseInputDtoTempo,
  type WorkoutTemplateExerciseResponseDto,
} from '@/generated/models';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { finiteNumber } from '@/features/trainer-workspace/lib/finite-number';
import { formatCount } from '@/features/trainer-workspace/lib/formatters';

export type IntensityKind = 'none' | 'rpe' | 'rir';

export type PrescriptionDraft = {
  sets: string;
  prescriptionType: WorkoutTemplateExerciseInputDtoPrescriptionType;
  repsMin: string;
  repsMax: string;
  durationSeconds: string;
  restSeconds: string;
  intensity: IntensityKind;
  targetRpe: string;
  targetRir: string;
  tempo: string;
  notes: string;
};

export const defaultPrescriptionDraft = (): PrescriptionDraft => ({
  sets: '3',
  prescriptionType: WorkoutTemplateExerciseInputDtoPrescriptionType.REPS,
  repsMin: '8',
  repsMax: '10',
  durationSeconds: '30',
  restSeconds: '90',
  intensity: 'none',
  targetRpe: '',
  targetRir: '',
  tempo: '',
  notes: '',
});

export function draftFromItem(item: WorkoutTemplateExerciseResponseDto): PrescriptionDraft {
  const rpe = finiteNumber(item.targetRpe);
  const rir = finiteNumber(item.targetRir);
  return {
    sets: String(item.sets),
    prescriptionType: item.prescriptionType as WorkoutTemplateExerciseInputDtoPrescriptionType,
    repsMin: item.repsMin != null ? String(item.repsMin) : '8',
    repsMax: item.repsMax != null ? String(item.repsMax) : '10',
    durationSeconds: item.durationSeconds != null ? String(item.durationSeconds) : '30',
    restSeconds: String(item.restSeconds),
    intensity: rpe != null ? 'rpe' : rir != null ? 'rir' : 'none',
    targetRpe: rpe != null ? String(rpe) : '',
    targetRir: rir != null ? String(rir) : '',
    tempo: item.tempo ?? '',
    notes: item.notes ?? '',
  };
}

export function itemToInput(item: WorkoutTemplateExerciseResponseDto): WorkoutTemplateExerciseInputDto {
  return draftToInput(item.exercise.id, draftFromItem(item));
}

function parseBoundedInt(value: string, min: number, max: number): number | null {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

export function draftToInput(
  exerciseId: string,
  draft: PrescriptionDraft,
): WorkoutTemplateExerciseInputDto {
  const sets = parseBoundedInt(draft.sets, 1, 20);
  const restSeconds = parseBoundedInt(draft.restSeconds, 0, 3600);
  if (sets == null || restSeconds == null) {
    throw new Error('Invalid prescription');
  }

  const input: WorkoutTemplateExerciseInputDto = {
    exerciseId,
    sets,
    prescriptionType: draft.prescriptionType,
    restSeconds,
  };

  if (draft.prescriptionType === WorkoutTemplateExerciseInputDtoPrescriptionType.DURATION) {
    const durationSeconds = parseBoundedInt(draft.durationSeconds, 1, 7200);
    if (durationSeconds == null) {
      throw new Error('Invalid duration');
    }
    input.durationSeconds = asOpenApiField<WorkoutTemplateExerciseInputDtoDurationSeconds>(durationSeconds);
  } else {
    const repsMin = parseBoundedInt(draft.repsMin, 1, 100);
    const repsMax = parseBoundedInt(draft.repsMax, 1, 100);
    if (repsMin == null || repsMax == null || repsMax < repsMin) {
      throw new Error('Invalid reps');
    }
    input.repsMin = asOpenApiField<WorkoutTemplateExerciseInputDtoRepsMin>(repsMin);
    input.repsMax = asOpenApiField<WorkoutTemplateExerciseInputDtoRepsMax>(repsMax);
  }

  if (draft.intensity === 'rpe') {
    const rpe = Number(draft.targetRpe.trim());
    if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
      throw new Error('Invalid RPE');
    }
    input.targetRpe = asOpenApiField<WorkoutTemplateExerciseInputDtoTargetRpe>(Math.round(rpe * 10) / 10);
    input.targetRir = asOpenApiField<WorkoutTemplateExerciseInputDtoTargetRir>(null);
  } else if (draft.intensity === 'rir') {
    const rir = parseBoundedInt(draft.targetRir, 0, 10);
    if (rir == null) {
      throw new Error('Invalid RIR');
    }
    input.targetRir = asOpenApiField<WorkoutTemplateExerciseInputDtoTargetRir>(rir);
    input.targetRpe = asOpenApiField<WorkoutTemplateExerciseInputDtoTargetRpe>(null);
  }

  const tempo = draft.tempo.trim().slice(0, 20);
  if (tempo) {
    input.tempo = asOpenApiField<WorkoutTemplateExerciseInputDtoTempo>(tempo);
  }

  const notes = draft.notes.trim().slice(0, 1000);
  if (notes) {
    input.notes = asOpenApiField<WorkoutTemplateExerciseInputDtoNotes>(notes);
  }

  return input;
}

export function formatPrescriptionScan(item: WorkoutTemplateExerciseResponseDto): string {
  const parts = [formatCount(item.sets, 'set', 'sets')];
  if (item.prescriptionType === WorkoutTemplateExerciseInputDtoPrescriptionType.DURATION) {
    if (item.durationSeconds != null) {
      parts.push(`${item.durationSeconds}s`);
    }
  } else if (item.repsMin != null && item.repsMax != null) {
    parts.push(item.repsMin === item.repsMax ? `${item.repsMin} reps` : `${item.repsMin}–${item.repsMax} reps`);
  } else if (item.repsMin != null) {
    parts.push(`${item.repsMin} reps`);
  }
  if (item.restSeconds > 0) {
    parts.push(`${item.restSeconds}s rest`);
  }
  const rpe = finiteNumber(item.targetRpe);
  if (rpe != null) {
    parts.push(`RPE ${rpe}`);
  }
  const rir = finiteNumber(item.targetRir);
  if (rir != null) {
    parts.push(`RIR ${rir}`);
  }
  if (item.tempo) {
    parts.push(item.tempo);
  }
  return parts.join(' · ');
}
