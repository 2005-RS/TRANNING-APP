import { z } from 'zod';
import { clientProfileCopy } from '@/features/client-profile/copy';
import {
  ClientSelfUpdateDtoExperienceLevel,
  ClientSelfUpdateDtoPrimaryGoal,
} from '@/generated/models';

/** Mirrors backend `CLIENT_PHONE_MAX_LENGTH` / `CLIENT_GOAL_NOTES_MAX_LENGTH` (clients.constants.ts). */
export const PROFILE_PHONE_MAX_LENGTH = 32;
export const PROFILE_GOAL_NOTES_MAX_LENGTH = 2000;

/** Same rule as the backend DTO: digits and common phone punctuation (e.g. "+506 8888-8888"). */
const PHONE_PATTERN = /^[\d+\-\s().]*$/;

const goals: readonly string[] = Object.values(ClientSelfUpdateDtoPrimaryGoal);
const levels: readonly string[] = Object.values(ClientSelfUpdateDtoExperienceLevel);

export type ProfileFormValues = {
  phone: string;
  primaryGoal: string;
  experienceLevel: string;
  goalNotes: string;
};

export function getProfileSchema() {
  return z.object({
    phone: z
      .string()
      .max(PROFILE_PHONE_MAX_LENGTH, clientProfileCopy.phoneInvalid)
      .refine((value) => PHONE_PATTERN.test(value.trim()), {
        message: clientProfileCopy.phoneInvalid,
      }),
    primaryGoal: z.string().refine((value) => goals.includes(value), {
      message: clientProfileCopy.selectRequired,
    }),
    experienceLevel: z.string().refine((value) => levels.includes(value), {
      message: clientProfileCopy.selectRequired,
    }),
    goalNotes: z.string().max(PROFILE_GOAL_NOTES_MAX_LENGTH),
  });
}
