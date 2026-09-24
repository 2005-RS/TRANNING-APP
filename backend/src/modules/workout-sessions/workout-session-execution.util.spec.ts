import { BadRequestException } from '@nestjs/common';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { assertActualSetMatchesPrescription } from './workout-session-execution.util';

describe('assertActualSetMatchesPrescription', () => {
  it('allows zero reps and zero load for REPS', () => {
    expect(() =>
      assertActualSetMatchesPrescription(WorkoutPrescriptionType.REPS, {
        actualReps: 0,
        actualLoadKg: 0,
        actualRir: 2,
      }),
    ).not.toThrow();
  });

  it('rejects duration on a REPS exercise and reps on a DURATION exercise', () => {
    expect(() =>
      assertActualSetMatchesPrescription(WorkoutPrescriptionType.REPS, {
        actualDurationSeconds: 30,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertActualSetMatchesPrescription(WorkoutPrescriptionType.DURATION, {
        actualReps: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects mixed RPE/RIR and missing actual values', () => {
    expect(() =>
      assertActualSetMatchesPrescription(WorkoutPrescriptionType.REPS, {
        actualReps: 8,
        actualRpe: 8,
        actualRir: 2,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertActualSetMatchesPrescription(WorkoutPrescriptionType.REPS, {}),
    ).toThrow(BadRequestException);
  });
});
