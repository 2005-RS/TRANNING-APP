import { z } from 'zod';
import { authCopy } from '@/features/auth/copy';

export function getLoginFormSchema() {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, authCopy.validation.emailRequired)
      .email(authCopy.validation.emailInvalid),
    password: z.string().min(1, authCopy.validation.passwordRequired),
  });
}

export const loginFormSchema = {
  safeParse: (value: unknown) => getLoginFormSchema().safeParse(value),
  parse: (value: unknown) => getLoginFormSchema().parse(value),
};

export type LoginFormValues = z.infer<ReturnType<typeof getLoginFormSchema>>;
