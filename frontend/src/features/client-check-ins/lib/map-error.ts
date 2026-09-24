import { ApiError, mapApiError, type UserFacingError } from '@/shared/errors/api-error';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { commonCopy } from '@/i18n/locales/common-live';

export function mapCheckInError(error: unknown): UserFacingError {
  const mapped = mapApiError(error);
  if (error instanceof ApiError) {
    if (error.statusCode === 409) {
      return {
        title: mapped.title,
        description: clientCheckInsCopy.error.conflict,
        requestId: mapped.requestId,
      };
    }
    if (error.statusCode === 403) {
      return {
        title: mapped.title,
        description: clientCheckInsCopy.error.forbidden,
        requestId: mapped.requestId,
      };
    }
    if (error.statusCode === 404) {
      return {
        title: mapped.title,
        description: clientCheckInsCopy.error.notFound,
        requestId: mapped.requestId,
      };
    }
  }
  if (mapped.description === commonCopy.errors.genericShort) {
    return {
      ...mapped,
      description: clientCheckInsCopy.error.network,
    };
  }
  return mapped;
}
