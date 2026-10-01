import { mapApiError, type UserFacingError } from '@/shared/errors/api-error';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';

export function mapCheckInError(error: unknown): UserFacingError {
  const mapped = mapApiError(error);
  switch (mapped.kind) {
    case 'conflict':
      return { ...mapped, description: clientCheckInsCopy.error.conflict };
    case 'forbidden':
      return { ...mapped, description: clientCheckInsCopy.error.forbidden };
    case 'not-found':
      return { ...mapped, description: clientCheckInsCopy.error.notFound };
    case 'network':
      return { ...mapped, description: clientCheckInsCopy.error.network };
    default:
      return mapped;
  }
}
