import { render, screen, waitFor, within } from '@testing-library/react';
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
import { clientCopy } from '@/features/navigation/copy';
import { clientProgressCopy } from '@/features/client-progress/copy';
import { windowForPeriod } from '@/features/client-progress/lib/period';
import {
  progressMockState,
  resetProgressMockState,
} from '@/features/client-progress/tests/msw-progress';
import {
  populatedBodyList,
  populatedExerciseList,
  populatedProgressSummary,
  previousProgressSummary,
  singleBodyList,
  zeroProgressSummary,
} from '@/features/client-progress/tests/fixtures';

const timeout = 4000;

function renderProgress(entry = '/client/progress') {
  return render(
    <TestApp initialEntry={entry} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Client progress', { timeout: 15_000 }, () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetProgressMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows section skeletons instead of Loading...', async () => {
    progressMockState.delayMs = 1500;
    progressMockState.summary = populatedProgressSummary;
    renderProgress();

    await screen.findByRole('navigation', { name: clientCopy.mainNav }, { timeout: 10_000 });
    expect(
      await screen.findByRole('status', { name: clientProgressCopy.loadingLabel }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders summary metrics, exercise names, and a factual body change', async () => {
    progressMockState.summary = populatedProgressSummary;
    progressMockState.previousSummary = previousProgressSummary;
    progressMockState.exercises = populatedExerciseList;
    progressMockState.body = populatedBodyList;
    renderProgress();

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.title }, { timeout }),
    ).toBeInTheDocument();
    expect(await screen.findByText('18450 kg', undefined, { timeout })).toBeInTheDocument();
    expect(screen.getByText('8 sessions')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('512')).toBeInTheDocument();
    expect(screen.getByText('Back squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText(/−1\.4 kg/)).toBeInTheDocument();
    expect(screen.queryByText(/great progress/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/healthy/i)).not.toBeInTheDocument();
    expect(screen.queryByText('77777777-dddd-4ddd-8ddd-777777777777')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('updates the URL and date window when the period changes', async () => {
    const user = userEvent.setup();
    progressMockState.summary = populatedProgressSummary;
    renderProgress('/client/progress?period=30');

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.title }, { timeout }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(progressMockState.lastCurrentSummaryDateTo).toBe(windowForPeriod(30).dateTo);
    });

    await user.click(screen.getByRole('button', { name: clientProgressCopy.periodAria[7] }));

    expect(await screen.findByRole('button', { name: clientProgressCopy.periodAria[7] })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => {
      expect(progressMockState.lastCurrentSummaryDateFrom).toBe(windowForPeriod(7).dateFrom);
      expect(progressMockState.lastCurrentSummaryDateTo).toBe(windowForPeriod(7).dateTo);
    });
  });

  it('treats zero as a valid empty period, not missing data', async () => {
    progressMockState.summary = zeroProgressSummary;
    renderProgress();

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.overview.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 kg')).toBeInTheDocument();
    expect(screen.getByText('0 sessions')).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.overview.emptyHint)).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument();
  });

  it('keeps body language factual when only one measurement exists', async () => {
    progressMockState.body = singleBodyList;
    renderProgress();

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.body.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('81 kg')).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.body.onePoint)).toBeInTheDocument();
    expect(screen.queryByText(/great|good|bad|healthy/i)).not.toBeInTheDocument();
  });

  it('retries an independent summary error without leaving the Client shell', async () => {
    const user = userEvent.setup();
    progressMockState.summaryStatus = 500;
    progressMockState.exercises = populatedExerciseList;
    renderProgress();

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
    expect(screen.queryByText('Progress summary failed')).not.toBeInTheDocument();

    progressMockState.summaryStatus = 200;
    progressMockState.summary = populatedProgressSummary;
    await user.click(screen.getByRole('button', { name: clientProgressCopy.error.retry }));

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.overview.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('Back squat')).toBeInTheDocument();
  });

  it('opens exercise detail from the list', async () => {
    const user = userEvent.setup();
    progressMockState.exercises = populatedExerciseList;
    renderProgress();

    const squat = await screen.findByRole('link', { name: /Back squat/ }, { timeout });
    await user.click(squat);

    expect(
      await screen.findByRole('heading', { name: 'Back squat' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.detail.highestLoad)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: clientCopy.mainNav });
    expect(within(nav).getByRole('link', { name: 'Progress' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
