import { formatCompactNumber } from '@/features/client-dashboard/lib/formatters';
import type { WorkoutSessionPrescriptionResponseDto } from '@/generated/models';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';
import { workoutCopy } from '@/features/workout-session/copy';

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
  return workoutCopy.days[value] ?? null;
}

export function formatPrescription(
  prescription: WorkoutSessionPrescriptionResponseDto,
): string {
  const parts: string[] = [];
  const setCount = formatCompactNumber(prescription.sets);
  const copy = workoutCopy.prescription;
  parts.push(prescription.sets === 1 ? copy.oneSet : copy.sets(setCount));

  if (prescription.type === WorkoutSessionPrescriptionResponseDtoType.DURATION) {
    if (prescription.durationSeconds != null) {
      parts.push(copy.seconds(formatCompactNumber(prescription.durationSeconds)));
    }
  } else if (prescription.repsMin != null && prescription.repsMax != null) {
    if (prescription.repsMin === prescription.repsMax) {
      parts.push(copy.reps(formatCompactNumber(prescription.repsMin)));
    } else {
      parts.push(
        copy.reps(`${formatCompactNumber(prescription.repsMin)}–${formatCompactNumber(prescription.repsMax)}`),
      );
    }
  } else if (prescription.repsMin != null) {
    parts.push(copy.reps(formatCompactNumber(prescription.repsMin)));
  }

  if (prescription.targetLoadKg != null) {
    parts.push(`${formatCompactNumber(prescription.targetLoadKg)} kg`);
  }

  if (prescription.restSeconds > 0) {
    parts.push(copy.rest(formatCompactNumber(prescription.restSeconds)));
  }

  return parts.join(' · ');
}

/** Elapsed workout time: m:ss under an hour, h:mm:ss under a day, then "N d H h". */
export function formatElapsed(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  if (clamped < 3600) {
    return formatRestRemaining(clamped);
  }
  if (clamped < 86_400) {
    const hours = Math.floor(clamped / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const seconds = clamped % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  const days = Math.floor(clamped / 86_400);
  const hours = Math.floor((clamped % 86_400) / 3600);
  return `${days} d ${hours} h`;
}
