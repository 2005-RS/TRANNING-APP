import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError, mapApiError } from '@/shared/errors/api-error';
import { commonCopy } from '@/i18n/locales/common-live';

describe('mapApiError', () => {
  it('keeps field messages for validation errors', () => {
    const mapped = mapApiError(
      new ApiError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: ['name should not be empty'],
        path: '/api/v1/clients',
        timestamp: '2026-09-03T20:00:00.000Z',
        requestId: 'req-1',
      }),
    );

    expect(mapped.fieldMessages).toEqual(['name should not be empty']);
    expect(mapped.requestId).toBe('req-1');
  });

  it('hides unexpected server details', () => {
    const mapped = mapApiError(
      new ApiError({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'relation "secret" does not exist',
        path: '/api/v1/health',
        timestamp: '2026-09-03T20:00:00.000Z',
        requestId: 'req-2',
      }),
    );

    expect(mapped.description).not.toContain('secret');
    expect(mapped.requestId).toBe('req-2');
    expect(mapped.kind).toBe('server');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [429, 'rate-limited'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('classifies HTTP %i as %s', (statusCode, kind) => {
    const mapped = mapApiError(
      new ApiError({
        statusCode,
        code: 'X',
        message: 'x',
        path: '/api/v1/x',
        timestamp: '2026-09-03T20:00:00.000Z',
        requestId: 'req-3',
      }),
    );
    expect(mapped.kind).toBe(kind);
  });

  it('gives a request that never reached the server its own message', () => {
    const mapped = mapApiError(new NetworkError());
    expect(mapped.kind).toBe('network');
    expect(mapped.title).toBe(commonCopy.errors.networkTitle);
    expect(mapped.description).toBe(commonCopy.errors.networkBody);
  });

  it('does not report an unrelated exception as a network failure', () => {
    const mapped = mapApiError(new TypeError('Cannot read properties of undefined'));
    expect(mapped.kind).toBe('unknown');
    expect(mapped.description).toBe(commonCopy.errors.genericShort);
  });
});
