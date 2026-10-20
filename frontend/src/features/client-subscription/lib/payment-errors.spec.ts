import { describe, expect, it } from 'vitest';
import { clientSubscriptionCopy } from '@/features/client-subscription/copy';
import { paymentError } from '@/features/client-subscription/lib/payment-errors';
import { ApiError, NetworkError } from '@/shared/errors/api-error';

function apiError(statusCode: number, message: string): ApiError {
  return new ApiError({
    statusCode,
    code: 'TEST_ERROR',
    message,
    path: '/api/v1/clients/me/subscription/payments',
    timestamp: '2026-10-10T00:00:00.000Z',
    requestId: 'req-subscription-test',
  });
}

describe('paymentError', () => {
  it.each([
    [apiError(409, 'A pending payment already exists'), clientSubscriptionCopy.pendingConflict],
    [apiError(409, 'This reference has already been used'), clientSubscriptionCopy.referenceUsed],
    [apiError(400, 'paidOn must be within the last 30 days'), clientSubscriptionCopy.invalidDate],
    [apiError(503, 'not configured'), clientSubscriptionCopy.unavailableError],
    [apiError(429, 'too many requests'), clientSubscriptionCopy.tooMany],
    [new NetworkError(), clientSubscriptionCopy.offline],
  ])('maps safe client copy', (error, expected) => {
    expect(paymentError(error, clientSubscriptionCopy)).toBe(expected);
  });
});
