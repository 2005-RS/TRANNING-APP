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

/**
 * The request never produced a response: offline, DNS or TLS failure, a
 * blocked request, or the API timeout. Extends TypeError because that is what
 * `fetch` itself rejects with.
 */
export class NetworkError extends TypeError {
  constructor() {
    super('The request could not be completed.');
    this.name = 'NetworkError';
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

export type UserFacingErrorKind =
  | 'invalid'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'network'
  | 'unknown';

export type UserFacingError = {
  kind: UserFacingErrorKind;
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
          kind: 'invalid',
          title: errors.checkInput,
          description: error.messages.join(' '),
          requestId: error.requestId,
          fieldMessages: error.messages,
        };
      case 401:
        return {
          kind: 'unauthorized',
          title: errors.signInRequired,
          description: errors.sessionInvalid,
          requestId: error.requestId,
        };
      case 403:
        return {
          kind: 'forbidden',
          title: errors.notAllowed,
          description: errors.notAllowedBody,
          requestId: error.requestId,
        };
      case 404:
        return {
          kind: 'not-found',
          title: errors.notFound,
          description: errors.notFoundBody,
          requestId: error.requestId,
        };
      case 409:
        return {
          kind: 'conflict',
          title: errors.cannotComplete,
          description: error.messages.join(' '),
          requestId: error.requestId,
        };
      case 429:
        return {
          kind: 'rate-limited',
          title: errors.tooMany,
          description: errors.tooManyBody,
          requestId: error.requestId,
        };
      default:
        return {
          kind: error.statusCode >= 500 ? 'server' : 'unknown',
          title: errors.genericTitle,
          description: errors.genericBody,
          requestId: error.requestId,
        };
    }
  }

  if (error instanceof NetworkError) {
    return {
      kind: 'network',
      title: errors.networkTitle,
      description: errors.networkBody,
    };
  }

  return {
    kind: 'unknown',
    title: errors.genericTitle,
    description: errors.genericShort,
  };
}
