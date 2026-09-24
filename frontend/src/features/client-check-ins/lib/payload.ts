import type {
  CheckInResponseDto,
  UpdateCheckInDto,
} from '@/generated/models';
import { finiteNumber } from '@/features/client-check-ins/lib/finite-number';
import {
  CHECK_IN_ADHERENCE_FIELDS,
  CHECK_IN_RATING_FIELDS,
  CHECK_IN_TEXT_FIELDS,
} from '@/features/client-check-ins/lib/fields';
import { formatAdherenceInput } from '@/features/client-check-ins/lib/formatters';
import type { CheckInFormValues } from '@/features/client-check-ins/schemas/check-in-form-schema';

function parseOptionalNumber(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalText(raw: string): string | null {
  const value = raw.trim();
  return value.length > 0 ? raw : null;
}

export function checkInToFormValues(checkIn: CheckInResponseDto): CheckInFormValues {
  const responses = checkIn.responses;
  return {
    periodStart: checkIn.periodStart,
    periodEnd: checkIn.periodEnd,
    sleepQuality: finiteNumber(responses.sleepQuality),
    energyLevel: finiteNumber(responses.energyLevel),
    stressLevel: finiteNumber(responses.stressLevel),
    hungerLevel: finiteNumber(responses.hungerLevel),
    recoveryLevel: finiteNumber(responses.recoveryLevel),
    trainingAdherencePct: formatAdherenceInput(responses.trainingAdherencePct),
    nutritionAdherencePct: formatAdherenceInput(responses.nutritionAdherencePct),
    wins: responses.wins ?? '',
    challenges: responses.challenges ?? '',
    generalNotes: responses.generalNotes ?? '',
  };
}

export function formValuesToUpdatePayload(values: CheckInFormValues): UpdateCheckInDto {
  return {
    periodStart: values.periodStart,
    periodEnd: values.periodEnd,
    sleepQuality: values.sleepQuality as UpdateCheckInDto['sleepQuality'],
    energyLevel: values.energyLevel as UpdateCheckInDto['energyLevel'],
    stressLevel: values.stressLevel as UpdateCheckInDto['stressLevel'],
    hungerLevel: values.hungerLevel as UpdateCheckInDto['hungerLevel'],
    recoveryLevel: values.recoveryLevel as UpdateCheckInDto['recoveryLevel'],
    trainingAdherencePct: parseOptionalNumber(
      values.trainingAdherencePct,
    ) as UpdateCheckInDto['trainingAdherencePct'],
    nutritionAdherencePct: parseOptionalNumber(
      values.nutritionAdherencePct,
    ) as UpdateCheckInDto['nutritionAdherencePct'],
    wins: parseOptionalText(values.wins) as UpdateCheckInDto['wins'],
    challenges: parseOptionalText(values.challenges) as UpdateCheckInDto['challenges'],
    generalNotes: parseOptionalText(values.generalNotes) as UpdateCheckInDto['generalNotes'],
  };
}

export function hasSubstantiveResponse(values: CheckInFormValues): boolean {
  const ratings = CHECK_IN_RATING_FIELDS.some((field) => values[field] !== null);
  if (ratings) {
    return true;
  }
  for (const field of CHECK_IN_ADHERENCE_FIELDS) {
    if (parseOptionalNumber(values[field]) !== null) {
      return true;
    }
  }
  return CHECK_IN_TEXT_FIELDS.some((field) => values[field].trim().length > 0);
}
