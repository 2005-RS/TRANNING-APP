import { passwordResetCopy } from '@/features/password-reset/copy';
import { ApiError, NetworkError } from '@/shared/errors/api-error';

export type ResetErrorKind = 'invalid-link' | 'rate-limited' | 'network' | 'generic';

export function resetErrorKind(error: unknown): ResetErrorKind {
  if (error instanceof ApiError) {
    if (error.statusCode === 400) return 'invalid-link';
    if (error.statusCode === 429) return 'rate-limited';
    return 'generic';
  }
  if (error instanceof NetworkError || error instanceof TypeError) return 'network';
  return 'generic';
}

export function resetErrorMessage(kind: Exclude<ResetErrorKind, 'invalid-link'>): string {
  if (kind === 'rate-limited') return passwordResetCopy.errors.rateLimited;
  if (kind === 'network') return passwordResetCopy.errors.network;
  return passwordResetCopy.errors.generic;
}
