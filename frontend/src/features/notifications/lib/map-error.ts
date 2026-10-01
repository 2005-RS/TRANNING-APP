import { mapApiError, type UserFacingError } from '@/shared/errors/api-error';
import { notificationsCopy } from '@/features/notifications/copy';

export function mapNotificationsError(error: unknown): UserFacingError {
  const mapped = mapApiError(error);
  if (mapped.kind === 'not-found') {
    return { ...mapped, description: notificationsCopy.error.notFound };
  }
  if (mapped.kind === 'network') {
    return { ...mapped, description: notificationsCopy.error.network };
  }
  return mapped;
}
