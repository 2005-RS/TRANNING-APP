import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken, clearAccessToken, getAccessToken } from '@/shared/lib/access-token';
import {
  apiFetch,
  AUTH_REFRESH_TIMEOUT_MS,
  refreshSession,
  setOnAuthFailure,
} from '@/shared/lib/api-mutator';

const nativeAbortTimeout = AbortSignal.timeout.bind(AbortSignal);

function abortOnlyRefreshTimeout() {
  return vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
    if (ms === AUTH_REFRESH_TIMEOUT_MS) {
      return AbortSignal.abort();
    }
    return nativeAbortTimeout(ms);
  });
}

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearAccessToken();
    setOnAuthFailure(null);
  });

  it('sends a bearer token from memory and retries once after a single refresh', async () => {
    setAccessToken('expired-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const body = await apiFetch<{ ok: boolean }>('/api/v1/auth/me');

    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[1]?.headers.get('Authorization'))).toBe(
      'Bearer expired-token',
    );
    expect(String(fetchMock.mock.calls[2]?.[1]?.headers.get('Authorization'))).toBe(
      'Bearer fresh-token',
    );
  });

  it('forwards an existing AbortSignal to fetch', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch<{ ok: boolean }>('/api/v1/health', {
      signal: controller.signal,
    });

    const forwarded = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(forwarded).toBeInstanceOf(AbortSignal);
    expect(forwarded).not.toBe(controller.signal);
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('treats a hung refresh as unavailable without expiring the session', async () => {
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    abortOnlyRefreshTimeout();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      }
      return new Promise(() => undefined);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshSession()).resolves.toEqual({ status: 'unavailable' });
    expect(onFailure).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('treats a network failure on refresh as unavailable without expiring the session', async () => {
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(refreshSession()).resolves.toEqual({ status: 'unavailable' });
    expect(onFailure).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('treats an explicit refresh 401 as unauthenticated', async () => {
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      ),
    );

    await expect(refreshSession()).resolves.toEqual({ status: 'unauthenticated' });
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('returns authenticated when refresh succeeds', async () => {
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: 'fresh-token' }), { status: 200 }),
      ),
    );

    await expect(refreshSession()).resolves.toEqual({ status: 'authenticated' });
    expect(getAccessToken()).toBe('fresh-token');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('does not treat a timed-out in-session refresh as an invalid session', async () => {
    setAccessToken('expired-token');
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    abortOnlyRefreshTimeout();
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).includes('/api/v1/auth/refresh')) {
        if (init?.signal?.aborted) {
          return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        }
        return new Promise(() => undefined);
      }
      return Promise.resolve(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/v1/auth/me')).rejects.toBeInstanceOf(TypeError);
    expect(onFailure).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('expired-token');
  });

  it('single-flights concurrent 401s through one refresh request', async () => {
    setAccessToken('expired-token');

    let releaseRefresh: ((response: Response) => void) | undefined;
    const refreshGate = new Promise<Response>((resolve) => {
      releaseRefresh = resolve;
    });

    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).includes('/api/v1/auth/refresh')) {
        return refreshGate;
      }

      if (getAccessToken() === 'expired-token') {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const requests = Promise.all([
      apiFetch<{ ok: boolean }>('/api/v1/auth/me'),
      apiFetch<{ ok: boolean }>('/api/v1/notifications/unread-count'),
      apiFetch<{ ok: boolean }>('/api/v1/clients/me'),
    ]);

    await vi.waitFor(() => {
      const refreshCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes('/api/v1/auth/refresh'),
      );
      expect(refreshCalls).toHaveLength(1);
    });

    releaseRefresh?.(
      new Response(JSON.stringify({ accessToken: 'fresh-token' }), {
        status: 200,
      }),
    );

    await expect(requests).resolves.toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes('/api/v1/auth/refresh'),
      ),
    ).toHaveLength(1);
  });

  it('does not refresh when the refresh endpoint returns 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Refresh failed',
          path: '/api/v1/auth/refresh',
          timestamp: '2026-09-03T20:00:00.000Z',
          requestId: 'req-refresh',
        }),
        { status: 401 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiFetch('/api/v1/auth/refresh', { method: 'POST' }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when logout returns 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Already signed out',
          path: '/api/v1/auth/logout',
          timestamp: '2026-09-03T20:00:00.000Z',
          requestId: 'req-logout',
        }),
        { status: 401 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/v1/auth/logout', { method: 'POST' })).rejects.toMatchObject(
      { statusCode: 401 },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 401 at most once after refresh', async () => {
    setAccessToken('expired-token');
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).includes('/api/v1/auth/refresh')) {
        setAccessToken('fresh-token');
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'fresh-token' }), {
            status: 200,
          }),
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/v1/auth/me')).rejects.toMatchObject({
      statusCode: 401,
    });

    const refreshCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/api/v1/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not refresh when login returns 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          path: '/api/v1/auth/login',
          timestamp: '2026-09-03T20:00:00.000Z',
          requestId: 'req-login',
        }),
        { status: 401 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiFetch('/api/v1/auth/login', { method: 'POST' }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
