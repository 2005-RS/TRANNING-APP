import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import {
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { greetingHeadline } from '@/features/client-dashboard/lib/greeting';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  dashboardMockState,
  resetDashboardMockState,
} from '@/features/client-dashboard/tests/msw-dashboard';
import {
  emptyClientDashboard,
  partialOptionalClientDashboard,
  planOnlyClientDashboard,
  populatedClientDashboard,
} from '@/features/client-dashboard/tests/fixtures';
import { clientCopy, navigationCopy } from '@/features/navigation/copy';

const timeout = 4000;

function renderDashboard() {
  return render(
    <TestApp
      initialEntry="/client/dashboard"
      status="AUTHENTICATED"
      user={clientA}
    />,
  );
}

async function findGreeting() {
  return screen.findByRole('heading', { name: greetingHeadline(clientA.firstName) }, { timeout });
}

describe('Client dashboard', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetDashboardMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it(
    'shows a skeleton while the dashboard query is pending',
    { timeout: 15_000 },
    async () => {
    dashboardMockState.delayMs = 1500;
    dashboardMockState.body = populatedClientDashboard;
    renderDashboard();

    await screen.findByRole('navigation', { name: clientCopy.mainNav }, { timeout: 10_000 });
    expect(
      await screen.findByRole(
        'status',
        { name: clientDashboardCopy.loadingLabel },
        { timeout },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

    expect(await findGreeting()).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: clientDashboardCopy.loadingLabel }),
    ).not.toBeInTheDocument();
  },
  );

  it('renders greeting, primary training, summaries, and continue CTA', async () => {
    dashboardMockState.body = populatedClientDashboard;
    renderDashboard();

    expect(await findGreeting()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
    expect(screen.getByText('Hypertrophy block 4')).toBeInTheDocument();
    expect(screen.getByText('6 exercises')).toBeInTheDocument();
    expect(screen.getByText('8 sets recorded')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: clientDashboardCopy.primary.continueTraining }),
    ).toHaveAttribute('href', '/client/workout/cccccccc-cccc-4ccc-8ccc-cccccccccccc');

    expect(screen.getByRole('heading', { name: clientDashboardCopy.weekly.title })).toBeInTheDocument();
    expect(screen.getByText('Upper A')).toBeInTheDocument();
    const weeklyCard = screen
      .getByRole('heading', { name: clientDashboardCopy.weekly.title })
      .closest('section');
    expect(weeklyCard).not.toBeNull();
    expect(within(weeklyCard as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(
      within(weeklyCard as HTMLElement).getByText(clientDashboardCopy.weekly.sessions),
    ).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('18450 kg')).toBeInTheDocument();
    expect(screen.getByText('82.4 kg (−0.4 kg)')).toBeInTheDocument();
    expect(screen.getByText('Performance meals')).toBeInTheDocument();
    expect(screen.getByText('2400 kcal')).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.checkIn.waitingReview)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: clientDashboardCopy.checkIn.viewCheckIns }),
    ).toHaveAttribute('href', '/client/check-ins');

    expect(screen.queryByText('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).not.toBeInTheDocument();
    expect(screen.queryByText(clientA.id)).not.toBeInTheDocument();
    expect(screen.queryByText('cccccccc-cccc-4ccc-8ccc-cccccccccccc')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
  });

  it(
    'navigates the primary CTA into the in-progress workout',
    { timeout: 15_000 },
    async () => {
    const user = userEvent.setup();
    dashboardMockState.body = populatedClientDashboard;
    renderDashboard();

    await findGreeting();
    await user.click(
      screen.getByRole('link', { name: clientDashboardCopy.primary.continueTraining }),
    );

    expect(
      await screen.findByText('Back squat', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: clientCopy.mainNav })).not.toBeInTheDocument();
  });

  it('uses view training when a plan exists without an active session', async () => {
    dashboardMockState.body = planOnlyClientDashboard;
    renderDashboard();

    await findGreeting();
    expect(screen.getByRole('heading', { name: 'Hypertrophy block 4' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: clientDashboardCopy.primary.viewTraining }),
    ).toHaveAttribute('href', '/client/training');
    expect(
      screen.queryByRole('link', { name: clientDashboardCopy.primary.continueTraining }),
    ).not.toBeInTheDocument();
  });

  it('renders a polished empty state when no plan is assigned', async () => {
    dashboardMockState.body = emptyClientDashboard;
    renderDashboard();

    await findGreeting();
    expect(
      screen.getByRole('heading', { name: clientDashboardCopy.primary.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.weekly.empty)).toBeInTheDocument();
    const weeklyCard = screen
      .getByRole('heading', { name: clientDashboardCopy.weekly.title })
      .closest('section');
    expect(weeklyCard).not.toBeNull();
    expect(within(weeklyCard as HTMLElement).getByText('0')).toBeInTheDocument();
    const snapshotCard = screen
      .getByRole('heading', { name: clientDashboardCopy.progress.title })
      .closest('section');
    expect(snapshotCard).not.toBeNull();
    expect(within(snapshotCard as HTMLElement).getAllByText('0')).toHaveLength(2);
    expect(within(snapshotCard as HTMLElement).getByText('0 kg')).toBeInTheDocument();
    expect(within(snapshotCard as HTMLElement).getByText('0 min')).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.checkIn.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByText(clientDashboardCopy.nutrition.title)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: clientDashboardCopy.primary.viewTraining }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });

  it('stays usable when optional dashboard fields are missing', async () => {
    dashboardMockState.body = partialOptionalClientDashboard;
    renderDashboard();

    await findGreeting();
    expect(screen.getByRole('heading', { name: 'Foundation plan' })).toBeInTheDocument();
    expect(screen.getByText('Full body')).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.checkIn.draft)).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.progress.photosEmpty)).toBeInTheDocument();
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.queryByText(clientDashboardCopy.nutrition.title)).not.toBeInTheDocument();
  });

  it('shows a safe error state and retries the query', async () => {
    const user = userEvent.setup();
    dashboardMockState.status = 500;
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard failed')).not.toBeInTheDocument();

    dashboardMockState.status = 200;
    dashboardMockState.body = populatedClientDashboard;
    await user.click(screen.getByRole('button', { name: clientDashboardCopy.error.retry }));

    expect(await findGreeting()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
  });

  it('maps unexpected 403 to a safe message', async () => {
    dashboardMockState.status = 403;
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Not allowed' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Forbidden internals must not leak')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: clientDashboardCopy.error.retry }),
    ).toBeInTheDocument();
  });

  it('keeps a recoverable network failure inside the shell', async () => {
    dashboardMockState.failNetwork = true;
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientDashboardCopy.error.network)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: navigationCopy.userMenu })).toBeInTheDocument();
  });

  it('uses a stacked mobile structure with the primary action first', async () => {
    dashboardMockState.body = populatedClientDashboard;
    renderDashboard();
    await findGreeting();

    const headings = screen.getAllByRole('heading').map((node) => node.textContent);
    const greetingIndex = headings.findIndex((text) => text === greetingHeadline(clientA.firstName));
    const primaryIndex = headings.findIndex((text) => text === 'Lower A');
    const weeklyIndex = headings.findIndex((text) => text === clientDashboardCopy.weekly.title);
    const snapshotIndex = headings.findIndex(
      (text) => text === clientDashboardCopy.progress.title,
    );

    expect(greetingIndex).toBeGreaterThanOrEqual(0);
    expect(primaryIndex).toBeGreaterThan(greetingIndex);
    expect(weeklyIndex).toBeGreaterThan(primaryIndex);
    expect(snapshotIndex).toBeGreaterThan(weeklyIndex);

    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('link', { name: clientDashboardCopy.primary.continueTraining }),
    ).toBeInTheDocument();
  });
});
