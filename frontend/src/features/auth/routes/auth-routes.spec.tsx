import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authCopy } from '@/features/auth/copy';
import { clientCopy } from '@/features/navigation/copy';
import {
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { AUTH_REFRESH_TIMEOUT_MS } from '@/shared/lib/api-mutator';
import { greetingHeadline } from '@/features/client-dashboard/lib/greeting';

describe('auth routes', () => {
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

  it('sends an anonymous visitor from a protected route to login', async () => {
    render(<TestApp initialEntry="/client" status="UNAUTHENTICATED" />);

    expect(
      await screen.findByRole('heading', { name: authCopy.login.title }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('sends an authenticated visitor away from login', async () => {
    render(
      <TestApp initialEntry="/login" status="AUTHENTICATED" user={clientA} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: greetingHeadline(clientA.firstName) },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
  });

  it('does not render a protected Client route while restore is unresolved', async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      if (ms === AUTH_REFRESH_TIMEOUT_MS) {
        return AbortSignal.abort();
      }
      return nativeTimeout(ms);
    });

    render(
      <TestApp
        initialEntry="/client/dashboard"
        status="BOOTSTRAPPING"
        skipBootstrap={false}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: authCopy.restore.title }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: greetingHeadline(clientA.firstName) })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: clientCopy.mainNav })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: authCopy.login.title })).not.toBeInTheDocument();
  });
});
