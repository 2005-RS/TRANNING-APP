import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapAuthSession,
  loginWithPassword,
  logoutCurrentSession,
  resetAuthBootstrap,
} from '@/features/auth/lib/session-service';
import {
  authMockState,
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { clientA } from '@/features/auth/tests/fixtures';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/shared/lib/access-token';
import { AUTH_REFRESH_TIMEOUT_MS } from '@/shared/lib/api-mutator';

describe('auth session service', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('bootstraps from a valid refresh cookie into an authenticated user', async () => {
    authMockState.refreshOk = true;
    const result = await bootstrapAuthSession();
    expect(result).toEqual({ status: 'authenticated', user: clientA });
    expect(getAccessToken()).toBe('refresh-access-token');
  });

  it('treats a refresh 401 as an anonymous session', async () => {
    authMockState.refreshOk = false;
    const result = await bootstrapAuthSession();
    expect(result).toEqual({ status: 'unauthenticated' });
    expect(getAccessToken()).toBeNull();
  });

  it('clears the session when refresh succeeds but /me fails', async () => {
    authMockState.refreshOk = true;
    authMockState.meOk = false;
    const result = await bootstrapAuthSession();
    expect(result).toEqual({ status: 'unauthenticated' });
    expect(getAccessToken()).toBeNull();
  });

  it('treats a refresh network error as a temporary restore failure', async () => {
    const { http, HttpResponse } = await import('msw');
    authServer.use(
      http.post('http://localhost:3000/api/v1/auth/refresh', () => HttpResponse.error()),
    );

    const result = await bootstrapAuthSession();
    expect(result).toEqual({ status: 'unavailable' });
    expect(getAccessToken()).toBeNull();
  });

  it('treats a refresh timeout as a temporary restore failure', async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      if (ms === AUTH_REFRESH_TIMEOUT_MS) {
        return AbortSignal.abort();
      }
      return nativeTimeout(ms);
    });

    const result = await bootstrapAuthSession();
    expect(result).toEqual({ status: 'unavailable' });
    expect(getAccessToken()).toBeNull();
  });

  it('stores a memory access token after password login', async () => {
    const user = await loginWithPassword(clientA.email, 'any-password');
    expect(user).toEqual(clientA);
    expect(getAccessToken()).toBe('login-access-token');
  });

  it('clears the memory token even when logout HTTP fails', async () => {
    setAccessToken('still-here');
    const { http, HttpResponse } = await import('msw');
    authServer.use(
      http.post('http://localhost:3000/api/v1/auth/logout', () =>
        HttpResponse.json(
          {
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: 'unavailable',
            path: '/api/v1/auth/logout',
            timestamp: '2026-09-04T00:00:00.000Z',
            requestId: 'req-logout',
          },
          { status: 500 },
        ),
      ),
    );

    await logoutCurrentSession();
    expect(getAccessToken()).toBeNull();
  });
});
