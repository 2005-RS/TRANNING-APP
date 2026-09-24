import { BadRequestException } from '@nestjs/common';
import {
  assertWorkoutTemplatePrescription,
  WorkoutTemplatePrescriptionInput,
} from '../workout-templates/workout-template-prescription.util';

export interface TrainingPlanPrescriptionInput extends WorkoutTemplatePrescriptionInput {
  targetLoadKg?: number | null;
}

export function assertTrainingPlanPrescription(
  input: TrainingPlanPrescriptionInput,
): void {
  assertWorkoutTemplatePrescription(input);
  if (input.targetLoadKg != null && input.targetLoadKg < 0) {
    throw new BadRequestException(
      'targetLoadKg must be greater than or equal to 0',
    );
  }
}
