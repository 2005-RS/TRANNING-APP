import { BadRequestException } from '@nestjs/common';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';

export interface ActualSetInput {
  actualReps?: number | null;
  actualDurationSeconds?: number | null;
  actualLoadKg?: number | null;
  actualRpe?: number | null;
  actualRir?: number | null;
}

export function assertActualSetMatchesPrescription(
  prescriptionType: WorkoutPrescriptionType,
  set: ActualSetInput,
): void {
  const hasReps = set.actualReps != null;
  const hasDuration = set.actualDurationSeconds != null;
  if (hasReps === hasDuration) {
    throw new BadRequestException(
      'Each set must include exactly one of actualReps or actualDurationSeconds',
    );
  }

  if (prescriptionType === WorkoutPrescriptionType.REPS) {
    if (!hasReps) {
      throw new BadRequestException('REPS exercises require actualReps');
    }
    if (set.actualReps! < 0) {
      throw new BadRequestException(
        'actualReps must be greater than or equal to 0',
      );
    }
  } else {
    if (!hasDuration || set.actualDurationSeconds! < 1) {
      throw new BadRequestException(
        'DURATION exercises require actualDurationSeconds',
      );
    }
  }

  if (set.actualLoadKg != null && set.actualLoadKg < 0) {
    throw new BadRequestException(
      'actualLoadKg must be greater than or equal to 0',
    );
  }

  if (set.actualRpe != null && set.actualRir != null) {
    throw new BadRequestException('Provide actualRpe or actualRir, not both');
  }
}
