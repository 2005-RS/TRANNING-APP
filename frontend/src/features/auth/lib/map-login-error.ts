import { ApiError } from '@/shared/errors/api-error';
import { authCopy } from '@/features/auth/copy';

export type LoginErrorView = {
  message: string;
  requestId?: string;
};

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    return (
      text.includes('failed to fetch') ||
      text.includes('networkerror') ||
      text.includes('load failed')
    );
  }
  return false;
}

export function mapLoginError(error: unknown): LoginErrorView {
  if (isNetworkFailure(error)) {
    return { message: authCopy.errors.network };
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      return {
        message: authCopy.errors.invalidCredentials,
        requestId: error.requestId,
      };
    }
    if (error.statusCode === 429) {
      return {
        message: authCopy.errors.rateLimited,
        requestId: error.requestId,
      };
    }
    if (error.statusCode >= 500) {
      return {
        message: authCopy.errors.server,
        requestId: error.requestId,
      };
    }
    return {
      message: authCopy.errors.generic,
      requestId: error.requestId,
    };
  }

  return { message: authCopy.errors.generic };
}
