import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA, trainerA } from '@/features/auth/tests/fixtures';
import { authCopy } from '@/features/auth/copy';
import { homeForRole } from '@/features/auth/lib/role-home';
import { publicSiteCopySource as copy } from '@/features/public-site/copy';
import { isPublicSitePath } from '@/features/public-site/lib/public-paths';
import { trainingAssistantCopySource as assistantCopy } from '@/features/training-assistant/copy';

vi.mock('socket.io-client', async () => {
  const fake = await import('@/features/training-assistant/tests/fake-socket');
  return { io: fake.createFakeSocket };
});

const PAGES = [
  { path: '/', heading: copy.home.heading },
  { path: '/platform', heading: copy.platform.heading },
  { path: '/training', heading: copy.training.heading },
  { path: '/progress', heading: copy.progress.heading },
  { path: '/about', heading: copy.about.heading },
] as const;

function siteNav() {
  return screen.getByRole('navigation', { name: copy.nav.label });
}

describe('public website', () => {
  it.each(PAGES)('renders $path for anonymous visitors with nav, sign-in and the assistant', async ({ path, heading }) => {
    render(<TestApp initialEntry={path} status="UNAUTHENTICATED" />);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    const nav = siteNav();
    for (const key of ['home', 'platform', 'training', 'progress', 'about'] as const) {
      expect(within(nav).getByRole('link', { name: copy.nav[key] })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: copy.nav.signIn })[0]).toHaveAttribute('href', '/login');
    expect(screen.getByRole('button', { name: assistantCopy.launcherLabel })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: copy.nav.goToApp })).not.toBeInTheDocument();
  });

  it('marks the current page in the site navigation', async () => {
    render(<TestApp initialEntry="/training" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: copy.training.heading });

    const nav = siteNav();
    expect(within(nav).getByRole('link', { name: copy.nav.training })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: copy.nav.home })).not.toHaveAttribute('aria-current');
  });

  it('navigates between public pages', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry="/" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: copy.home.heading });

    await user.click(within(siteNav()).getByRole('link', { name: copy.nav.about }));
    expect(await screen.findByRole('heading', { level: 1, name: copy.about.heading })).toBeInTheDocument();
  });

  it('keeps signed-in users on the public page and offers their own workspace', async () => {
    render(<TestApp initialEntry="/" status="AUTHENTICATED" user={trainerA} />);

    expect(await screen.findByRole('heading', { level: 1, name: copy.home.heading })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: copy.nav.goToApp })[0]).toHaveAttribute('href', homeForRole(trainerA.role));
    expect(screen.queryByRole('link', { name: copy.nav.signIn })).not.toBeInTheDocument();
  });

  it('points a signed-in client at the client home', async () => {
    render(<TestApp initialEntry="/about" status="AUTHENTICATED" user={clientA} />);

    await screen.findByRole('heading', { level: 1, name: copy.about.heading });
    expect(screen.getAllByRole('link', { name: copy.nav.goToApp })[0]).toHaveAttribute('href', homeForRole(clientA.role));
  });

  it('renders during session restore instead of the boot screen', async () => {
    render(<TestApp initialEntry="/platform" status="BOOTSTRAPPING" />);

    expect(await screen.findByRole('heading', { level: 1, name: copy.platform.heading })).toBeInTheDocument();
  });

  it('does not promise sign-up or prices', async () => {
    render(<TestApp initialEntry="/" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: copy.home.heading });

    expect(screen.queryByRole('link', { name: /sign up|register|pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d|€\d|free trial/i)).not.toBeInTheDocument();
  });

  it('offers the public assistant on the login screen, linked back to the site', async () => {
    render(<TestApp initialEntry="/login" status="UNAUTHENTICATED" />);

    await screen.findByRole('heading', { name: authCopy.login.title }, { timeout: 4000 });
    expect(screen.getByRole('button', { name: assistantCopy.launcherLabel })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: authCopy.backToSite })[0]).toHaveAttribute('href', '/');
  });

  it('treats only the marketing paths as public', () => {
    expect(isPublicSitePath('/')).toBe(true);
    expect(isPublicSitePath('/about')).toBe(true);
    expect(isPublicSitePath('/login')).toBe(false);
    expect(isPublicSitePath('/client')).toBe(false);
    expect(isPublicSitePath('/trainer/clients')).toBe(false);
  });
});
