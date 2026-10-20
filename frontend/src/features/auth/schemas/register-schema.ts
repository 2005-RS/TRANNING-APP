import { z } from 'zod';
import {
  RegisterDtoExperienceLevel,
  RegisterDtoPrimaryGoal,
  type RegisterDto,
} from '@/generated/models';
import { authCopy } from '@/features/auth/copy';

export const REGISTER_PASSWORD_MIN_LENGTH = 12;
export const REGISTER_PASSWORD_MAX_LENGTH = 128;

const PRIMARY_GOALS: readonly string[] = Object.values(RegisterDtoPrimaryGoal);
const EXPERIENCE_LEVELS: readonly string[] = Object.values(
  RegisterDtoExperienceLevel,
);

/**
 * Raw form values. Selects start empty and the checkbox starts unchecked, so the
 * schema validates plain strings/booleans (zod 3 API) and `toRegisterDto`
 * narrows them to the generated contract after validation.
 */
export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  primaryGoal: string;
  experienceLevel: string;
  acceptTerms: boolean;
};

export const EMPTY_REGISTER_FORM_VALUES: RegisterFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  primaryGoal: '',
  experienceLevel: '',
  acceptTerms: false,
};

export function getRegisterFormSchema() {
  return z.object({
    firstName: z.string().trim().min(1, authCopy.validation.firstNameRequired),
    lastName: z.string().trim().min(1, authCopy.validation.lastNameRequired),
    email: z
      .string()
      .trim()
      .min(1, authCopy.validation.emailRequired)
      .email(authCopy.validation.emailInvalid),
    password: z
      .string()
      .min(REGISTER_PASSWORD_MIN_LENGTH, authCopy.validation.passwordLength)
      .max(REGISTER_PASSWORD_MAX_LENGTH, authCopy.validation.passwordLength),
    primaryGoal: z
      .string()
      .refine((value) => PRIMARY_GOALS.includes(value), {
        message: authCopy.validation.primaryGoalRequired,
      }),
    experienceLevel: z
      .string()
      .refine((value) => EXPERIENCE_LEVELS.includes(value), {
        message: authCopy.validation.experienceLevelRequired,
      }),
    acceptTerms: z.boolean().refine((value) => value, {
      message: authCopy.validation.termsRequired,
    }),
  });
}

/** Only call with values that passed `getRegisterFormSchema()`. */
export function toRegisterDto(values: RegisterFormValues): RegisterDto {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    password: values.password,
    primaryGoal: values.primaryGoal as RegisterDto['primaryGoal'],
    experienceLevel: values.experienceLevel as RegisterDto['experienceLevel'],
    acceptTerms: true,
  };
}
