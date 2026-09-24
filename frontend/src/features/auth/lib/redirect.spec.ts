import { describe, expect, it } from 'vitest';
import { resolveAuthenticatedDestination, sanitizeInternalPath } from '@/features/auth/lib/redirect';
import { AuthUserResponseDtoRole } from '@/generated/models';

describe('sanitizeInternalPath', () => {
  it('accepts nested in-app role paths', () => {
    expect(sanitizeInternalPath('/client/progress')).toBe('/client/progress');
    expect(sanitizeInternalPath('/trainer')).toBe('/trainer');
    expect(sanitizeInternalPath('/admin/assignments')).toBe('/admin/assignments');
  });

  it('rejects external or protocol-relative destinations', () => {
    expect(sanitizeInternalPath('https://evil.example')).toBeUndefined();
    expect(sanitizeInternalPath('//evil.example')).toBeUndefined();
    expect(sanitizeInternalPath('/login')).toBeUndefined();
  });
});

describe('resolveAuthenticatedDestination', () => {
  it('returns a nested CLIENT path when the redirect matches the role', () => {
    expect(
      resolveAuthenticatedDestination(AuthUserResponseDtoRole.CLIENT, '/client/progress'),
    ).toBe('/client/progress');
  });

  it('normalizes a role root to the role dashboard', () => {
    expect(
      resolveAuthenticatedDestination(AuthUserResponseDtoRole.TRAINER, '/trainer'),
    ).toBe('/trainer/dashboard');
  });

  it('ignores a CLIENT redirect when a TRAINER signs in', () => {
    expect(
      resolveAuthenticatedDestination(
        AuthUserResponseDtoRole.TRAINER,
        '/client/progress',
      ),
    ).toBe('/trainer/dashboard');
  });

  it('ignores external-looking values that passed sanitizer gaps', () => {
    expect(
      resolveAuthenticatedDestination(
        AuthUserResponseDtoRole.ADMIN,
        'https://evil.example',
      ),
    ).toBe('/admin/dashboard');
  });
});
