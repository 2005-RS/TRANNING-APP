import { describe, expect, it } from 'vitest';
import {
  WorkoutTemplateExerciseInputDtoPrescriptionType,
  WorkoutTemplateExerciseResponseDtoPrescriptionType,
  type WorkoutTemplateExerciseResponseDto,
} from '@/generated/models';
import { catalogExercise, toTemplateExerciseSummary } from '@/features/trainer-workspace/tests/fixtures';
import {
  defaultPrescriptionDraft,
  draftToInput,
  formatPrescriptionScan,
} from '@/features/trainer-workspace/lib/prescription';

const item: WorkoutTemplateExerciseResponseDto = {
  id: 'item-1',
  position: 1,
  exercise: toTemplateExerciseSummary(catalogExercise),
  sets: 4,
  prescriptionType: WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS,
  repsMin: 8,
  repsMax: 10,
  durationSeconds: null,
  restSeconds: 120,
  targetRpe: 8,
  targetRir: null,
  tempo: '3010',
  notes: 'Brace.',
};

describe('prescription helpers', () => {
  it('formats a compact scan line from real template fields', () => {
    expect(formatPrescriptionScan(item)).toBe('4 sets · 8–10 reps · 120s rest · RPE 8 · 3010');
  });

  it('builds a default REPS input without load', () => {
    const input = draftToInput(catalogExercise.id, defaultPrescriptionDraft());
    expect(input).toEqual({
      exerciseId: catalogExercise.id,
      sets: 3,
      prescriptionType: WorkoutTemplateExerciseInputDtoPrescriptionType.REPS,
      restSeconds: 90,
      repsMin: 8,
      repsMax: 10,
    });
    expect(input).not.toHaveProperty('targetLoadKg');
  });

  it('rejects invalid repetition ranges before the API', () => {
    expect(() =>
      draftToInput(catalogExercise.id, { ...defaultPrescriptionDraft(), repsMax: '4', repsMin: '8' }),
    ).toThrow('Invalid reps');
  });
});
