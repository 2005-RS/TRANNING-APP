import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionProvider } from '@/app/providers/auth-session-provider';
import { getAuthMeQueryKey } from '@/generated/auth/auth';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clientA, clientB } from '@/features/auth/tests/fixtures';
import {
  authMockState,
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { createAppQueryClient } from '@/shared/lib/query-client';
import { AUTH_REFRESH_TIMEOUT_MS } from '@/shared/lib/api-mutator';
import { clearAccessToken, getAccessToken } from '@/shared/lib/access-token';

const nativeAbortTimeout = AbortSignal.timeout.bind(AbortSignal);

function abortOnlyRefreshTimeout() {
  return vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
    if (ms === AUTH_REFRESH_TIMEOUT_MS) {
      return AbortSignal.abort();
    }
    return nativeAbortTimeout(ms);
  });
}

function SessionProbe() {
  const { status, user, login, logout, retryRestore, continueToSignIn } = useAuthSession();
  return (
    <div>
      <p>status:{status}</p>
      <p>user:{user?.email ?? 'none'}</p>
      <button
        type="button"
        onClick={() =>
          void login({ email: authMockState.currentUser.email, password: 'pw' })
        }
      >
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
      <button type="button" onClick={() => void retryRestore()}>
        retry-restore
      </button>
      <button type="button" onClick={continueToSignIn}>
        continue-sign-in
      </button>
    </div>
  );
}

describe('AuthSessionProvider', () => {
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

  it('bootstraps silently to unauthenticated when refresh is 401', async () => {
    authMockState.refreshOk = false;
    const queryClient = createAppQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <SessionProbe />
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('status:UNAUTHENTICATED')).toBeInTheDocument();
    });
    expect(screen.queryByRole('status', { name: /unable|error|failed/i })).not.toBeInTheDocument();
    expect(screen.queryByText('status:RESTORE_FAILED')).not.toBeInTheDocument();
  });

  it('treats a refresh timeout as restore failure, not an invalid session', async () => {
    abortOnlyRefreshTimeout();
    const queryClient = createAppQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <SessionProbe />
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('status:RESTORE_FAILED')).toBeInTheDocument();
    });
    expect(screen.queryByText('status:UNAUTHENTICATED')).not.toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('retries a restore timeout and authenticates when refresh succeeds', async () => {
    const user = userEvent.setup();
    const timeoutSpy = abortOnlyRefreshTimeout();
    const queryClient = createAppQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <SessionProbe />
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('status:RESTORE_FAILED')).toBeInTheDocument();
    });

    timeoutSpy.mockImplementation(nativeAbortTimeout);
    authMockState.refreshOk = true;
    await user.click(screen.getByRole('button', { name: 'retry-restore' }));

    await waitFor(() => {
      expect(screen.getByText('status:AUTHENTICATED')).toBeInTheDocument();
    });
    expect(screen.getByText(`user:${clientA.email}`)).toBeInTheDocument();
    expect(getAccessToken()).toBe('refresh-access-token');
  });

  it('lets the user continue to sign in from a restore failure', async () => {
    const user = userEvent.setup();
    abortOnlyRefreshTimeout();
    const queryClient = createAppQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <SessionProbe />
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('status:RESTORE_FAILED')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'continue-sign-in' }));
    expect(screen.getByText('status:UNAUTHENTICATED')).toBeInTheDocument();
  });

  it('clears the query cache on logout so a later user cannot see prior data', async () => {
    const queryClient = createAppQueryClient();
    const user = userEvent.setup();
    authMockState.currentUser = clientA;
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider skipBootstrap initialStatus="UNAUTHENTICATED">
          <SessionProbe />
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    queryClient.setQueryData(['private-client-a'], { secret: 'client-a' });
    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => {
      expect(screen.getByText(`user:${clientA.email}`)).toBeInTheDocument();
    });
    expect(queryClient.getQueryData(['private-client-a'])).toBeUndefined();
    queryClient.setQueryData(['private-client-a'], { secret: 'client-a' });

    await user.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => {
      expect(screen.getByText('status:UNAUTHENTICATED')).toBeInTheDocument();
    });
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(['private-client-a'])).toBeUndefined();
    expect(queryClient.getQueryData(getAuthMeQueryKey())).toBeUndefined();

    authMockState.currentUser = clientB;
    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => {
      expect(screen.getByText(`user:${clientB.email}`)).toBeInTheDocument();
    });
    expect(queryClient.getQueryData(['private-client-a'])).toBeUndefined();
  });
});
