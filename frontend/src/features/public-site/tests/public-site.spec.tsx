import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
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

// jsdom has no IntersectionObserver; the landing reveals content on scroll.
class StubIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
});

const HOME_HEADING = copy.landing.headline.join(' ');

const PAGES = [
  { path: '/', heading: HOME_HEADING },
  { path: '/platform', heading: copy.platform.heading },
  { path: '/training', heading: copy.training.heading },
  { path: '/progress', heading: copy.progress.heading },
  { path: '/about', heading: copy.about.heading },
] as const;

function siteNav() {
  return screen.getByRole('navigation', { name: copy.nav.label });
}

function pagesNav() {
  return screen.getByRole('navigation', { name: copy.nav.pages });
}

describe('public website', () => {
  it.each(PAGES)('renders $path for anonymous visitors with nav, sign-in and the assistant', async ({ path, heading }) => {
    render(<TestApp initialEntry={path} status="UNAUTHENTICATED" />);

    expect(await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 4000 })).toBeInTheDocument();
    const nav = siteNav();
    for (const key of ['home', 'training', 'nutrition', 'progress', 'how'] as const) {
      expect(within(nav).getByRole('link', { name: copy.nav[key] })).toBeInTheDocument();
    }
    const pages = pagesNav();
    for (const key of ['platform', 'training', 'progress', 'about'] as const) {
      expect(within(pages).getByRole('link', { name: copy.nav[key] })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: copy.nav.signIn })[0]).toHaveAttribute('href', '/login');
    expect(screen.getByRole('button', { name: assistantCopy.launcherLabel })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: copy.nav.goToApp })).not.toBeInTheDocument();
  });

  it('marks the current page in the pages navigation', async () => {
    render(<TestApp initialEntry="/training" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: copy.training.heading });

    const pages = pagesNav();
    expect(within(pages).getByRole('link', { name: copy.nav.training })).toHaveAttribute('aria-current', 'page');
    expect(within(pages).getByRole('link', { name: copy.nav.about })).not.toHaveAttribute('aria-current');
  });

  it('links the header sections to anchors on the landing page', async () => {
    render(<TestApp initialEntry="/" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: HOME_HEADING }, { timeout: 4000 });

    const nav = siteNav();
    expect(within(nav).getByRole('link', { name: copy.nav.training })).toHaveAttribute('href', '/#entrenamiento');
    expect(within(nav).getByRole('link', { name: copy.nav.nutrition })).toHaveAttribute('href', '/#nutricion');
    expect(within(nav).getByRole('link', { name: copy.nav.progress })).toHaveAttribute('href', '/#progreso');
    expect(within(nav).getByRole('link', { name: copy.nav.how })).toHaveAttribute('href', '/#como-funciona');
    for (const id of ['entrenamiento', 'nutricion', 'progreso', 'como-funciona']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('labels every figure on the landing page as sample data', async () => {
    render(<TestApp initialEntry="/" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: HOME_HEADING }, { timeout: 4000 });

    expect(screen.getAllByText(copy.landing.demoLabel).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.landing.nutrition.disclaimer)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: new RegExp(copy.landing.primary, 'i') })[0]).toHaveAttribute('href', '/login');
  });

  it('navigates between public pages', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry="/" status="UNAUTHENTICATED" />);
    await screen.findByRole('heading', { level: 1, name: HOME_HEADING }, { timeout: 4000 });

    await user.click(within(pagesNav()).getByRole('link', { name: copy.nav.about }));
    expect(await screen.findByRole('heading', { level: 1, name: copy.about.heading })).toBeInTheDocument();
  });

  it('keeps signed-in users on the public page and offers their own workspace', async () => {
    render(<TestApp initialEntry="/" status="AUTHENTICATED" user={trainerA} />);

    expect(await screen.findByRole('heading', { level: 1, name: HOME_HEADING }, { timeout: 4000 })).toBeInTheDocument();
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
    await screen.findByRole('heading', { level: 1, name: HOME_HEADING }, { timeout: 4000 });

    expect(screen.queryByRole('link', { name: /sign up|register|pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d|€\d|free trial/i)).not.toBeInTheDocument();
  });

  it('offers the public assistant on the login screen, linked back to the site', async () => {
    render(<TestApp initialEntry="/login" status="UNAUTHENTICATED" />);

    await screen.findByRole('heading', { name: authCopy.login.title }, { timeout: 4000 });
    expect(screen.getByRole('button', { name: assistantCopy.launcherLabel })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: authCopy.backToSite })[0]).toHaveAttribute('href', '/');
  });

  it('keeps "Sign in" as the only page heading on the login screen', async () => {
    render(<TestApp initialEntry="/login" status="UNAUTHENTICATED" />);

    await screen.findByRole('heading', { name: authCopy.login.title }, { timeout: 4000 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('treats only the marketing paths as public', () => {
    expect(isPublicSitePath('/')).toBe(true);
    expect(isPublicSitePath('/about')).toBe(true);
    expect(isPublicSitePath('/login')).toBe(false);
    expect(isPublicSitePath('/client')).toBe(false);
    expect(isPublicSitePath('/trainer/clients')).toBe(false);
  });
});
