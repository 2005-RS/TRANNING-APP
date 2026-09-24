import type { AdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { commonCopy } from '@/i18n/locales/common-live';
import { ApiError, mapApiError, type UserFacingError } from '@/shared/errors/api-error';

export type AdminMutationContext = 'account' | 'assignment' | 'exercise' | 'exerciseMedia' | 'food' | 'status';

function hasMessage(error: ApiError, fragment: string) {
  return error.messages.some((message) => message.toLowerCase().includes(fragment));
}

function conflictMessage(error: ApiError, context: AdminMutationContext, copy: AdminWorkspaceCopy) {
  switch (context) {
    case 'account':
      return hasMessage(error, 'email') ? copy.common.emailInUse : copy.common.conflictBody;
    case 'assignment':
      return copy.clients.assignmentConflict;
    case 'exercise':
      return hasMessage(error, 'name') ? copy.exercises.nameInUse : copy.common.conflictBody;
    case 'exerciseMedia':
      if (hasMessage(error, 'archived')) {
        return copy.exercises.archivedConflict;
      }
      return hasMessage(error, 'limit') ? copy.exercises.mediaLimit : copy.exercises.mediaConflict;
    default:
      return copy.common.conflictBody;
  }
}

/** Localized, user-safe message for a failed Admin mutation. Backend message text is never rendered. */
export function adminMutationError(error: unknown, context: AdminMutationContext, copy: AdminWorkspaceCopy) {
  if (error instanceof ApiError) {
    if (error.statusCode === 400 || error.statusCode === 422) {
      return copy.common.checkFields;
    }
    if (error.statusCode === 409) {
      return conflictMessage(error, context, copy);
    }
  }
  return mapApiError(error).description;
}

/**
 * `mapApiError` for page-level query failures without echoing backend text.
 * A 400 on a read means a malformed identifier or search value, so it is presented as not found.
 */
export function adminQueryError(error: unknown, copy: AdminWorkspaceCopy): UserFacingError {
  const mapped = mapApiError(error);
  if (error instanceof ApiError && error.statusCode === 400) {
    return { title: commonCopy.errors.notFound, description: commonCopy.errors.notFoundBody, requestId: error.requestId };
  }
  if (error instanceof ApiError && error.statusCode === 409) {
    return { ...mapped, description: copy.common.conflictBody };
  }
  return mapped;
}
