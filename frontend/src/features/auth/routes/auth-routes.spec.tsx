import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { clientWelcomeCopy } from '@/features/client-welcome/copy';

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

  it('sends an authenticated visitor away from registration', async () => {
    render(
      <TestApp initialEntry="/register" status="AUTHENTICATED" user={clientA} />,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: greetingHeadline(clientA.firstName) },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  });

  it('opens client welcome after a successful registration', { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry="/register" status="UNAUTHENTICATED" />);

    await screen.findByRole('heading', { name: authCopy.register.title }, { timeout: 10_000 });
    await user.type(screen.getByLabelText(authCopy.register.firstNameLabel), 'Ada');
    await user.type(screen.getByLabelText(authCopy.register.lastNameLabel), 'Client');
    await user.type(screen.getByLabelText(authCopy.login.emailLabel), 'ada@example.test');
    await user.type(screen.getByLabelText(authCopy.login.passwordLabel), 'a-strong-password');
    await user.selectOptions(
      screen.getByLabelText(authCopy.register.primaryGoalLabel),
      'GENERAL_FITNESS',
    );
    await user.selectOptions(
      screen.getByLabelText(authCopy.register.experienceLevelLabel),
      'BEGINNER',
    );
    await user.click(screen.getByLabelText(authCopy.register.acceptTerms));
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(
      await screen.findByRole(
        'heading',
        { name: clientWelcomeCopy.welcome.replace('{{name}}', clientA.firstName) },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
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
