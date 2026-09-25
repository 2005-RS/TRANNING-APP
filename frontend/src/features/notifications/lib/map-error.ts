import { ApiError, mapApiError, type UserFacingError } from '@/shared/errors/api-error';
import { notificationsCopy } from '@/features/notifications/copy';
import { commonCopy } from '@/i18n/locales/common-live';

export function mapNotificationsError(error: unknown): UserFacingError {
  const mapped = mapApiError(error);
  if (error instanceof ApiError && error.statusCode === 404) {
    return { title: mapped.title, description: notificationsCopy.error.notFound, requestId: mapped.requestId };
  }
  if (mapped.description === commonCopy.errors.genericShort) {
    return { ...mapped, description: notificationsCopy.error.network };
  }
  return mapped;
}
