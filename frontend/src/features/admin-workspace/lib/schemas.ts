import { z } from 'zod';
import type { AdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { parseNumberInput } from '@/features/admin-workspace/lib/formatters';
import { formatNumber, interpolate } from '@/i18n/format';

/** UX validation mirroring the generated DTO limits. The backend remains the authority. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(copy: AdminWorkspaceCopy, max: number) {
  return z
    .string()
    .trim()
    .min(1, copy.common.fieldRequired)
    .max(max, interpolate(copy.common.tooLong, { max }));
}

function optionalText(copy: AdminWorkspaceCopy, max: number) {
  return z.string().trim().max(max, interpolate(copy.common.tooLong, { max }));
}

function catalogName(copy: AdminWorkspaceCopy) {
  const message = interpolate(copy.common.nameLength, { max: 150 });
  return z.string().trim().min(1, copy.common.fieldRequired).min(2, message).max(150, message);
}

function numberInRange(copy: AdminWorkspaceCopy, max: number, required: boolean) {
  const message = interpolate(copy.common.numberRange, { min: formatNumber(0), max: formatNumber(max) });
  return z
    .string()
    .trim()
    .refine((value) => !required || value.length > 0, copy.common.fieldRequired)
    .refine((value) => {
      if (!value) {
        return true;
      }
      const parsed = parseNumberInput(value);
      return parsed !== undefined && parsed >= 0 && parsed <= max;
    }, message);
}

function email(copy: AdminWorkspaceCopy) {
  return z
    .string()
    .trim()
    .min(1, copy.common.fieldRequired)
    .regex(EMAIL_PATTERN, copy.common.invalidEmail);
}

function password(copy: AdminWorkspaceCopy) {
  return z.string().min(12, copy.common.passwordLength).max(128, copy.common.passwordLength);
}

export function trainerFormSchema(copy: AdminWorkspaceCopy, mode: 'create' | 'edit') {
  return z.object({
    email: email(copy),
    password: mode === 'create' ? password(copy) : z.string(),
    firstName: requiredText(copy, 100),
    lastName: requiredText(copy, 100),
    phone: optionalText(copy, 32),
    professionalTitle: optionalText(copy, 120),
    bio: optionalText(copy, 2000),
  });
}

export function clientFormSchema(copy: AdminWorkspaceCopy, mode: 'create' | 'edit') {
  return z.object({
    email: email(copy),
    password: mode === 'create' ? password(copy) : z.string(),
    firstName: requiredText(copy, 100),
    lastName: requiredText(copy, 100),
    phone: optionalText(copy, 32),
    dateOfBirth: z.string(),
    primaryGoal: z.string().min(1, copy.common.fieldRequired),
    experienceLevel: z.string().min(1, copy.common.fieldRequired),
    goalNotes: optionalText(copy, 2000),
  });
}

export function exerciseFormSchema(copy: AdminWorkspaceCopy) {
  return z.object({
    name: catalogName(copy),
    description: optionalText(copy, 2000),
    instructions: optionalText(copy, 5000),
    primaryMuscleGroup: z.string().min(1, copy.common.fieldRequired),
    equipmentType: z.string().min(1, copy.common.fieldRequired),
    difficultyLevel: z.string().min(1, copy.common.fieldRequired),
  });
}

export function foodFormSchema(copy: AdminWorkspaceCopy) {
  return z.object({
    name: catalogName(copy),
    brand: optionalText(copy, 150),
    description: optionalText(copy, 1000),
    caloriesPer100g: numberInRange(copy, 99999.99, true),
    proteinGPer100g: numberInRange(copy, 1000, true),
    carbohydratesGPer100g: numberInRange(copy, 1000, true),
    fatGPer100g: numberInRange(copy, 1000, true),
    fiberGPer100g: numberInRange(copy, 1000, false),
  });
}

export const EXERCISE_MEDIA_MIME_TYPES = {
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export function exerciseMediaTypeFor(mimeType: string): 'VIDEO' | 'IMAGE' | null {
  if ((EXERCISE_MEDIA_MIME_TYPES.VIDEO as readonly string[]).includes(mimeType)) {
    return 'VIDEO';
  }
  if ((EXERCISE_MEDIA_MIME_TYPES.IMAGE as readonly string[]).includes(mimeType)) {
    return 'IMAGE';
  }
  return null;
}
