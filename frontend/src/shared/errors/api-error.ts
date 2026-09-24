export type ApiErrorBody = {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messages: string[];
  readonly path: string;
  readonly timestamp: string;
  readonly requestId: string;

  constructor(body: ApiErrorBody) {
    const messages = Array.isArray(body.message) ? body.message : [body.message];
    super(messages.join(' '));
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.messages = messages;
    this.path = body.path;
    this.timestamp = body.timestamp;
    this.requestId = body.requestId;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.statusCode === 'number' &&
    typeof body.code === 'string' &&
    typeof body.path === 'string' &&
    typeof body.timestamp === 'string' &&
    typeof body.requestId === 'string' &&
    (typeof body.message === 'string' || Array.isArray(body.message))
  );
}

export type UserFacingError = {
  title: string;
  description: string;
  requestId?: string;
  fieldMessages?: string[];
};

import { commonCopy } from '@/i18n/locales/common-live';

export function mapApiError(error: unknown): UserFacingError {
  const errors = commonCopy.errors;
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        return {
          title: errors.checkInput,
          description: error.messages.join(' '),
          requestId: error.requestId,
          fieldMessages: error.messages,
        };
      case 401:
        return {
          title: errors.signInRequired,
          description: errors.sessionInvalid,
          requestId: error.requestId,
        };
      case 403:
        return {
          title: errors.notAllowed,
          description: errors.notAllowedBody,
          requestId: error.requestId,
        };
      case 404:
        return {
          title: errors.notFound,
          description: errors.notFoundBody,
          requestId: error.requestId,
        };
      case 409:
        return {
          title: errors.cannotComplete,
          description: error.messages.join(' '),
          requestId: error.requestId,
        };
      case 429:
        return {
          title: errors.tooMany,
          description: errors.tooManyBody,
          requestId: error.requestId,
        };
      default:
        return {
          title: errors.genericTitle,
          description: errors.genericBody,
          requestId: error.requestId,
        };
    }
  }

  return {
    title: errors.genericTitle,
    description: errors.genericShort,
  };
}
