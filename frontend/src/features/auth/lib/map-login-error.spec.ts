import { describe, expect, it } from 'vitest';
import { mapLoginError } from '@/features/auth/lib/map-login-error';
import { authCopy } from '@/features/auth/copy';
import { ApiError } from '@/shared/errors/api-error';

describe('mapLoginError', () => {
  it('uses a generic 401 message', () => {
    const mapped = mapLoginError(
      new ApiError({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'user missing',
        path: '/api/v1/auth/login',
        timestamp: '2026-09-04T00:00:00.000Z',
        requestId: 'abc',
      }),
    );
    expect(mapped.message).toBe(authCopy.errors.invalidCredentials);
    expect(mapped.message).not.toContain('user missing');
    expect(mapped.requestId).toBe('abc');
  });

  it('maps rate limits, network, and server failures', () => {
    expect(
      mapLoginError(
        new ApiError({
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'slow down',
          path: '/api/v1/auth/login',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'r',
        }),
      ).message,
    ).toBe(authCopy.errors.rateLimited);

    expect(mapLoginError(new TypeError('Failed to fetch')).message).toBe(
      authCopy.errors.network,
    );

    expect(
      mapLoginError(
        new ApiError({
          statusCode: 500,
          code: 'INTERNAL_ERROR',
          message: 'select * from users',
          path: '/api/v1/auth/login',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 's',
        }),
      ).message,
    ).toBe(authCopy.errors.server);
  });
});
