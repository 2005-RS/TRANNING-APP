import { z } from 'zod';
import { passwordResetCopy } from '@/features/password-reset/copy';

export const RESET_PASSWORD_MIN_LENGTH = 12;
export const RESET_PASSWORD_MAX_LENGTH = 128;

export function getForgotPasswordSchema() {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, passwordResetCopy.validation.emailRequired)
      .email(passwordResetCopy.validation.emailInvalid),
  });
}

export type ForgotPasswordValues = z.infer<ReturnType<typeof getForgotPasswordSchema>>;

export function getResetPasswordSchema() {
  return z
    .object({
      password: z
        .string()
        .min(RESET_PASSWORD_MIN_LENGTH, passwordResetCopy.validation.passwordLength)
        .max(RESET_PASSWORD_MAX_LENGTH, passwordResetCopy.validation.passwordLength),
      confirm: z.string(),
    })
    .refine((value) => value.password === value.confirm, {
      message: passwordResetCopy.validation.passwordMismatch,
      path: ['confirm'],
    });
}

export type ResetPasswordValues = z.infer<ReturnType<typeof getResetPasswordSchema>>;
