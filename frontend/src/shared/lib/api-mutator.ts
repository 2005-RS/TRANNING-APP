import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';
import { getApiOrigin } from './api-origin';
import { AUTH_API, isAuthRefreshExcluded } from './auth-paths';
import { ApiError, isApiErrorBody } from '../errors/api-error';

type RefreshResponse = {
  accessToken: string;
};

export type RefreshOutcome =
  | { status: 'authenticated' }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

/**
 * Bounded bootstrap refresh. Healthy cookie refresh is well under this
 * (audit: ~600ms on preview). Chrome can hang 15–21s on a dead origin;
 * 4s caps restore UI without treating a stall as HTTP 401.
 */
export const AUTH_REFRESH_TIMEOUT_MS = 4_000;

/** Ordinary API calls abort instead of hanging the Client UI on a stalled origin. */
export const API_REQUEST_TIMEOUT_MS = 12_000;

let refreshInFlight: Promise<RefreshOutcome> | null = null;
let onAuthFailure: (() => void) | null = null;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) {
    return timeout;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, timeout]);
  }
  return timeout;
}

export function setOnAuthFailure(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

function resolveUrl(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }

  const origin = getApiOrigin();
  return `${origin}${input.startsWith('/') ? input : `/${input}`}`;
}

function pathOnly(url: string): string {
  try {
    return new URL(url, getApiOrigin()).pathname;
  } catch {
    return url;
  }
}

function shouldAttemptRefresh(url: string, status: number): boolean {
  if (status !== 401) {
    return false;
  }

  return !isAuthRefreshExcluded(pathOnly(url));
}

function expireSession(): void {
  clearAccessToken();
  onAuthFailure?.();
}

async function parseError(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null);
  if (isApiErrorBody(payload)) {
    return new ApiError(payload);
  }

  return new ApiError({
    statusCode: response.status,
    code: 'HTTP_ERROR',
    message: response.statusText || 'Request failed',
    path: pathOnly(response.url),
    timestamp: new Date().toISOString(),
    requestId: response.headers.get('x-request-id') ?? 'unknown',
  });
}

export async function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const response = await fetch(resolveUrl(AUTH_API.refresh), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(AUTH_REFRESH_TIMEOUT_MS),
      });

      if (response.status === 401) {
        expireSession();
        return { status: 'unauthenticated' };
      }

      if (!response.ok) {
        return { status: 'unavailable' };
      }

      const body = (await response.json()) as RefreshResponse;
      if (!body.accessToken) {
        return { status: 'unavailable' };
      }

      setAccessToken(body.accessToken);
      return { status: 'authenticated' };
    } catch {
      return { status: 'unavailable' };
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Orval fetch mutator. The second argument must remain RequestInit so Orval
 * detects `hasSecondArg` and generates:
 * `({ signal }) => operation({ signal, ...requestOptions })`.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const init = options ?? {};
  const resolvedUrl = resolveUrl(url);
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const execute = (requestHeaders: Headers) =>
    fetch(resolvedUrl, {
      ...init,
      headers: requestHeaders,
      credentials: 'include',
      signal: withTimeout(init.signal ?? undefined, API_REQUEST_TIMEOUT_MS),
    });

  let response: Response;
  try {
    response = await execute(headers);
  } catch (error) {
    if (isAbortError(error) && !init.signal?.aborted) {
      throw new TypeError('The request could not be completed.');
    }
    throw error;
  }
  let hasRetriedAfterRefresh = false;

  if (shouldAttemptRefresh(resolvedUrl, response.status)) {
    const outcome = await refreshSession();
    if (outcome.status === 'unavailable') {
      throw new TypeError('The request could not be completed.');
    }
    if (outcome.status === 'authenticated') {
      hasRetriedAfterRefresh = true;
      const retryHeaders = new Headers(headers);
      const nextToken = getAccessToken();
      if (nextToken) {
        retryHeaders.set('Authorization', `Bearer ${nextToken}`);
      } else {
        retryHeaders.delete('Authorization');
      }
      try {
        response = await execute(retryHeaders);
      } catch (error) {
        if (isAbortError(error) && !init.signal?.aborted) {
          throw new TypeError('The request could not be completed.');
        }
        throw error;
      }
    }
  }

  if (
    response.status === 401 &&
    hasRetriedAfterRefresh &&
    !isAuthRefreshExcluded(pathOnly(resolvedUrl))
  ) {
    expireSession();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
