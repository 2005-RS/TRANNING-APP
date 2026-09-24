import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { adminA, clientA, trainerA } from '@/features/auth/tests/fixtures';
import { authCopy } from '@/features/auth/copy';
import { clientCopy, navigationCopy } from '@/features/navigation/copy';
import {
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { greetingHeadline } from '@/features/client-dashboard/lib/greeting';

const timeout = 4000;

function href() {
  return screen.getByTestId('router-href').textContent ?? '';
}

function clientHomeHeading() {
  return greetingHeadline(clientA.firstName);
}

beforeEach(() => {
  authServer.listen({ onUnhandledRequest: 'error' });
  resetAuthMockState();
  resetAuthBootstrap();
  clearAccessToken();
});

afterEach(() => {
  authServer.resetHandlers();
  authServer.close();
  resetAuthBootstrap();
  clearAccessToken();
});

describe('auth and role routes', () => {
  it('sends an anonymous visitor from a nested protected route to login with return-to', async () => {
    render(<TestApp initialEntry="/client/progress" status="UNAUTHENTICATED" />);

    expect(
      await screen.findByRole('heading', { name: authCopy.login.title }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toContain('/login');
    expect(href()).toContain('redirect=%2Fclient%2Fprogress');
  });

  it('sends an authenticated visitor away from login to their dashboard', async () => {
    render(
      <TestApp initialEntry="/login" status="AUTHENTICATED" user={clientA} />,
    );

    expect(
      await screen.findByRole('heading', { name: clientHomeHeading() }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/client/dashboard');
  });
});

describe('role shells', () => {
  it('redirects CLIENT /client to the client dashboard and shows bottom nav', async () => {
    render(
      <TestApp initialEntry="/client" status="AUTHENTICATED" user={clientA} />,
    );

    expect(
      await screen.findByRole('heading', { name: clientHomeHeading() }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/client/dashboard');
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('lets a CLIENT open Training, Progress, Nutrition, and More', { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    render(
      <TestApp
        initialEntry="/client/dashboard"
        status="AUTHENTICATED"
        user={clientA}
      />,
    );

    await screen.findByRole('heading', { name: clientHomeHeading() }, { timeout });
    await user.click(screen.getByRole('link', { name: 'Training' }));
    expect(
      await screen.findByRole('heading', { name: 'Training' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Training' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('link', { name: 'Progress' }));
    expect(
      await screen.findByRole('heading', { name: 'Progress' }, { timeout }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Nutrition' }));
    expect(
      await screen.findByRole('heading', { name: 'Nutrition' }, { timeout }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More' }));
    const more = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(within(more).getByRole('link', { name: 'Body progress' }));
    expect(
      await screen.findByRole('heading', { name: 'Body progress' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps a CLIENT out of trainer and admin shells', async () => {
    render(
      <TestApp
        initialEntry="/trainer/dashboard"
        status="AUTHENTICATED"
        user={clientA}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: clientHomeHeading() }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/client/dashboard');
  });

  it('redirects TRAINER /trainer to the trainer dashboard', async () => {
    render(
      <TestApp initialEntry="/trainer" status="AUTHENTICATED" user={trainerA} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/trainer/dashboard');
    expect(
      screen.getByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('lets a TRAINER open planned destinations', async () => {
    const user = userEvent.setup();
    render(
      <TestApp
        initialEntry="/trainer/dashboard"
        status="AUTHENTICATED"
        user={trainerA}
      />,
    );

    await screen.findByRole('heading', { name: 'Dashboard' }, { timeout });
    await user.click(screen.getAllByRole('link', { name: 'Clients' })[0]!);
    expect(
      await screen.findByRole('heading', { name: 'Clients' }, { timeout }),
    ).toBeInTheDocument();
  });

  it('keeps a TRAINER out of client routes', async () => {
    render(
      <TestApp
        initialEntry="/client/progress"
        status="AUTHENTICATED"
        user={trainerA}
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/trainer/dashboard');
  });

  it('redirects ADMIN /admin to the admin dashboard', async () => {
    render(
      <TestApp initialEntry="/admin" status="AUTHENTICATED" user={adminA} />,
    );

    await waitFor(() => {
      expect(href()).toBe('/admin/dashboard');
    });
  });

  it('keeps an ADMIN out of trainer routes', async () => {
    render(
      <TestApp
        initialEntry="/trainer/clients"
        status="AUTHENTICATED"
        user={adminA}
      />,
    );
    await waitFor(() => {
      expect(href()).toBe('/admin/dashboard');
    });
  });

  it('keeps a TRAINER out of admin routes', async () => {
    render(
      <TestApp
        initialEntry="/admin/clients"
        status="AUTHENTICATED"
        user={trainerA}
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/trainer/dashboard');
  });

  it('returns a CLIENT to a nested path after login redirect', async () => {
    render(
      <TestApp
        initialEntry="/login?redirect=/client/progress"
        status="AUTHENTICATED"
        user={clientA}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Progress' }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/client/progress');
  });

  it('ignores a CLIENT redirect when a TRAINER is already authenticated', async () => {
    render(
      <TestApp
        initialEntry="/login?redirect=/client/progress"
        status="AUTHENTICATED"
        user={trainerA}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout }),
    ).toBeInTheDocument();
    expect(href()).toBe('/trainer/dashboard');
  });

  it('opens and closes the trainer mobile navigation sheet', async () => {
    const user = userEvent.setup();
    render(
      <TestApp
        initialEntry="/trainer/dashboard"
        status="AUTHENTICATED"
        user={trainerA}
      />,
    );

    await screen.findByRole('heading', { name: 'Dashboard' }, { timeout });
    await user.click(
      screen.getByRole('button', { name: navigationCopy.openNavigation }),
    );
    const dialog = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(within(dialog).getByRole('link', { name: 'Exercises' }));
    expect(
      await screen.findByRole('heading', { name: 'Exercises' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('shell logout', () => {
  it('signs out from the user menu and returns to login', async () => {
    const user = userEvent.setup();
    render(
      <TestApp
        initialEntry="/client/dashboard"
        status="AUTHENTICATED"
        user={clientA}
      />,
    );

    await screen.findByRole('heading', { name: clientHomeHeading() }, { timeout });
    await user.click(screen.getByRole('button', { name: navigationCopy.userMenu }));
    await user.click(screen.getByRole('menuitem', { name: authCopy.session.logout }));

    expect(
      await screen.findByRole('heading', { name: authCopy.login.title }, { timeout }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(href()).toContain('/login');
    });
  });
});
