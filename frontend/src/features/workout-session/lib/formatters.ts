import { formatCompactNumber } from '@/features/client-dashboard/lib/formatters';
import type { WorkoutSessionPrescriptionResponseDto } from '@/generated/models';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';

const weekdayLabels: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

export function formatRestRemaining(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatScheduledDay(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return weekdayLabels[value] ?? null;
}

export function formatPrescription(
  prescription: WorkoutSessionPrescriptionResponseDto,
): string {
  const parts: string[] = [];
  const setCount = formatCompactNumber(prescription.sets);
  parts.push(`${setCount} sets`);

  if (prescription.type === WorkoutSessionPrescriptionResponseDtoType.DURATION) {
    if (prescription.durationSeconds != null) {
      parts.push(`${formatCompactNumber(prescription.durationSeconds)} sec`);
    }
  } else if (prescription.repsMin != null && prescription.repsMax != null) {
    if (prescription.repsMin === prescription.repsMax) {
      parts.push(`${formatCompactNumber(prescription.repsMin)} reps`);
    } else {
      parts.push(
        `${formatCompactNumber(prescription.repsMin)}–${formatCompactNumber(prescription.repsMax)} reps`,
      );
    }
  } else if (prescription.repsMin != null) {
    parts.push(`${formatCompactNumber(prescription.repsMin)} reps`);
  }

  if (prescription.targetLoadKg != null) {
    parts.push(`${formatCompactNumber(prescription.targetLoadKg)} kg`);
  }

  if (prescription.restSeconds > 0) {
    parts.push(`${formatCompactNumber(prescription.restSeconds)}s rest`);
  }

  return parts.join(' · ');
}
