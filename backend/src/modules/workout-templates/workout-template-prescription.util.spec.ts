import { BadRequestException } from '@nestjs/common';
import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';
import { assertWorkoutTemplatePrescription } from './workout-template-prescription.util';

describe('assertWorkoutTemplatePrescription', () => {
  it('accepts a REPS range and a DURATION block', () => {
    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
      }),
    ).not.toThrow();

    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.DURATION,
        durationSeconds: 45,
      }),
    ).not.toThrow();
  });

  it('rejects invalid REPS and DURATION combinations', () => {
    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 10,
        repsMax: 8,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        durationSeconds: 45,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.DURATION,
        durationSeconds: 0,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.DURATION,
        durationSeconds: 45,
        repsMin: 8,
        repsMax: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects RPE and RIR together', () => {
    expect(() =>
      assertWorkoutTemplatePrescription({
        prescriptionType: WorkoutPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        targetRpe: 8.5,
        targetRir: 2,
      }),
    ).toThrow(BadRequestException);
  });
});
