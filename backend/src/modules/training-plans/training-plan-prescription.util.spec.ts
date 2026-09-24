import { BadRequestException } from '@nestjs/common';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { assertTrainingPlanPrescription } from './training-plan-prescription.util';

describe('assertTrainingPlanPrescription', () => {
  it('reuses REPS/DURATION rules and allows zero target load', () => {
    expect(() =>
      assertTrainingPlanPrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        targetLoadKg: 0,
      }),
    ).not.toThrow();
  });

  it('rejects negative load and mixed RPE/RIR', () => {
    expect(() =>
      assertTrainingPlanPrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        targetLoadKg: -1,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertTrainingPlanPrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        targetRpe: 8,
        targetRir: 2,
      }),
    ).toThrow(BadRequestException);
  });
});
