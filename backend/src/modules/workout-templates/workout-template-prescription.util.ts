import { BadRequestException } from '@nestjs/common';
import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';

export interface WorkoutTemplatePrescriptionInput {
  prescriptionType: WorkoutPrescriptionType;
  repsMin?: number | null;
  repsMax?: number | null;
  durationSeconds?: number | null;
  targetRpe?: number | null;
  targetRir?: number | null;
}

export function assertWorkoutTemplatePrescription(
  input: WorkoutTemplatePrescriptionInput,
): void {
  if (input.targetRpe != null && input.targetRir != null) {
    throw new BadRequestException('Provide targetRpe or targetRir, not both');
  }

  if (input.prescriptionType === WorkoutPrescriptionType.REPS) {
    if (input.repsMin == null || input.repsMax == null) {
      throw new BadRequestException(
        'REPS prescriptions require repsMin and repsMax',
      );
    }
    if (input.repsMin < 1 || input.repsMax < input.repsMin) {
      throw new BadRequestException('Invalid rep range');
    }
    if (input.durationSeconds != null) {
      throw new BadRequestException(
        'REPS prescriptions cannot include durationSeconds',
      );
    }
    return;
  }

  if (input.durationSeconds == null || input.durationSeconds < 1) {
    throw new BadRequestException(
      'DURATION prescriptions require durationSeconds',
    );
  }
  if (input.repsMin != null || input.repsMax != null) {
    throw new BadRequestException(
      'DURATION prescriptions cannot include repsMin or repsMax',
    );
  }
}
