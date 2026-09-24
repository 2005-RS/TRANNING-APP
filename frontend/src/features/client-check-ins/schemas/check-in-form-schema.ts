import { z } from 'zod';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import {
  CHECK_IN_ADHERENCE_MAX,
  CHECK_IN_ADHERENCE_MIN,
  CHECK_IN_RATING_MAX,
  CHECK_IN_RATING_MIN,
  CHECK_IN_TEXT_MAX_LENGTH,
} from '@/features/client-check-ins/lib/fields';
import { CHECK_IN_MAX_PERIOD_SPAN_DAYS, periodSpanDays } from '@/features/client-check-ins/lib/period';

const optionalRating = z.number().int().min(CHECK_IN_RATING_MIN).max(CHECK_IN_RATING_MAX).nullable();

function optionalAdherence() {
  return z.string().superRefine((raw, ctx) => {
    const value = raw.trim();
    if (!value) {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: 'custom', message: clientCheckInsCopy.form.adherenceRange });
      return;
    }
    if (parsed < CHECK_IN_ADHERENCE_MIN || parsed > CHECK_IN_ADHERENCE_MAX) {
      ctx.addIssue({ code: 'custom', message: clientCheckInsCopy.form.adherenceRange });
    }
  });
}

function optionalText() {
  return z.string().max(CHECK_IN_TEXT_MAX_LENGTH, clientCheckInsCopy.form.textLength);
}

function refinePeriod(
  value: { periodStart: string; periodEnd: string },
  ctx: z.RefinementCtx,
) {
  const span = periodSpanDays(value.periodStart, value.periodEnd);
  if (span === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['periodStart'],
      message: clientCheckInsCopy.create.periodRequired,
    });
    return;
  }
  if (span < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['periodEnd'],
      message: clientCheckInsCopy.create.periodOrder,
    });
  }
  if (span > CHECK_IN_MAX_PERIOD_SPAN_DAYS) {
    ctx.addIssue({
      code: 'custom',
      path: ['periodEnd'],
      message: clientCheckInsCopy.create.periodSpan,
    });
  }
}

export function getCheckInFormSchema() {
  return z
    .object({
      periodStart: z.string().min(1, clientCheckInsCopy.create.periodRequired),
      periodEnd: z.string().min(1, clientCheckInsCopy.create.periodRequired),
      sleepQuality: optionalRating,
      energyLevel: optionalRating,
      stressLevel: optionalRating,
      hungerLevel: optionalRating,
      recoveryLevel: optionalRating,
      trainingAdherencePct: optionalAdherence(),
      nutritionAdherencePct: optionalAdherence(),
      wins: optionalText(),
      challenges: optionalText(),
      generalNotes: optionalText(),
    })
    .superRefine(refinePeriod);
}

export const checkInFormSchema = {
  safeParse: (value: unknown) => getCheckInFormSchema().safeParse(value),
  parse: (value: unknown) => getCheckInFormSchema().parse(value),
};

export type CheckInFormValues = z.infer<ReturnType<typeof getCheckInFormSchema>>;

export function getCreatePeriodSchema() {
  return z
    .object({
      periodStart: z.string().min(1, clientCheckInsCopy.create.periodRequired),
      periodEnd: z.string().min(1, clientCheckInsCopy.create.periodRequired),
    })
    .superRefine(refinePeriod);
}

export const createPeriodSchema = {
  safeParse: (value: unknown) => getCreatePeriodSchema().safeParse(value),
  parse: (value: unknown) => getCreatePeriodSchema().parse(value),
};

export type CreatePeriodValues = z.infer<ReturnType<typeof getCreatePeriodSchema>>;
