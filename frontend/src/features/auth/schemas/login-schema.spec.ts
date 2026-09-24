import { describe, expect, it } from 'vitest';
import { loginFormSchema } from '@/features/auth/schemas/login-schema';
import { authCopy } from '@/features/auth/copy';

describe('loginFormSchema', () => {
  it('requires a valid email and a password without strength rules', () => {
    expect(loginFormSchema.safeParse({ email: '', password: '' }).success).toBe(
      false,
    );
    expect(
      loginFormSchema.safeParse({ email: 'a@example.test', password: 'x' }).success,
    ).toBe(true);
    const weakButPresent = loginFormSchema.safeParse({
      email: 'a@example.test',
      password: '1',
    });
    expect(weakButPresent.success).toBe(true);
    expect(
      loginFormSchema.safeParse({ email: 'bad', password: 'x' }).error
        ?.issues[0]?.message,
    ).toBe(authCopy.validation.emailInvalid);
  });
});
