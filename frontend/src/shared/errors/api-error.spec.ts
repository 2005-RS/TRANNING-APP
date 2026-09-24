import { describe, expect, it } from 'vitest';
import { ApiError, mapApiError } from '@/shared/errors/api-error';

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
  });
});
