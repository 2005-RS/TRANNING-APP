import type { ClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { ApiError, mapApiError } from '@/shared/errors/api-error';

function hasMessage(error: ApiError, fragment: string): boolean {
  return error.messages.some((message) => message.toLowerCase().includes(fragment));
}

/** Maps stable API errors to safe, localized client-facing copy. */
export function paymentError(error: unknown, copy: ClientSubscriptionCopy): string {
  const mapped = mapApiError(error);

  if (mapped.kind === 'network') {
    return copy.offline;
  }
  if (!(error instanceof ApiError)) {
    return mapped.description;
  }
  if (error.statusCode === 429) {
    return copy.tooMany;
  }
  if (error.statusCode === 503) {
    return copy.unavailableError;
  }
  if (error.statusCode === 409) {
    if (hasMessage(error, 'already been used')) {
      return copy.referenceUsed;
    }
    if (hasMessage(error, 'already exists')) {
      return copy.pendingConflict;
    }
  }
  if (error.statusCode === 400 && hasMessage(error, 'within the last 30 days')) {
    return copy.invalidDate;
  }
  return copy.invalid;
}
