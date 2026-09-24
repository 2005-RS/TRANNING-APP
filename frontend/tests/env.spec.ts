import { describe, expect, it } from 'vitest';
import { readPublicEnv } from '@/shared/config/env';

describe('readPublicEnv', () => {
  it('accepts an absolute API origin without a trailing slash', () => {
    expect(
      readPublicEnv({
        VITE_API_URL: 'http://localhost:3000',
        VITE_APP_ENV: 'development',
      }),
    ).toEqual({
      VITE_API_URL: 'http://localhost:3000',
      VITE_APP_ENV: 'development',
    });
  });

  it('rejects a trailing slash and non-http values', () => {
    expect(() =>
      readPublicEnv({ VITE_API_URL: 'http://localhost:3000/' }),
    ).toThrow(/must not end with a slash/);

    expect(() => readPublicEnv({ VITE_API_URL: 'not-a-url' })).toThrow(
      /absolute http/,
    );
  });
});
