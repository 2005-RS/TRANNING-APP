import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  dashboardMockState,
  resetDashboardMockState,
} from '@/features/client-dashboard/tests/msw-dashboard';
import { populatedClientDashboard } from '@/features/client-dashboard/tests/fixtures';
import {
  checkInMockState,
  resetCheckInMockState,
  setCheckInList,
} from '@/features/client-check-ins/tests/msw-check-ins';
import {
  DRAFT_CHECK_IN_ID,
  partialCheckIn,
  populatedCheckIns,
  reviewedCheckIn,
  submittedCheckIn,
  zeroAdherenceCheckIn,
} from '@/features/client-check-ins/tests/fixtures';

const timeout = 4000;

function renderCheckIns(entry = '/client/check-ins') {
  return render(
    <TestApp initialEntry={entry} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Client check-ins', { timeout: 15_000 }, () => {
  beforeAll(async () => {
    await import('@/features/client-check-ins/components/client-check-ins-page');
    await import('@/features/client-check-ins/components/client-check-in-detail-page');
    await import('@/features/client-dashboard/components/client-dashboard-page');
  });
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetCheckInMockState();
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

  it('shows a skeleton instead of Loading...', async () => {
    checkInMockState.delayMs = 2_000;
    renderCheckIns();
    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.title }, { timeout }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: clientCheckInsCopy.loadingLabel }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows an empty state with a create CTA', async () => {
    checkInMockState.items = [];
    renderCheckIns();
    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.current.emptyTitle }, { timeout }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: clientCheckInsCopy.current.start }),
    ).toBeInTheDocument();
  });

  it('renders latest status and history without loading every detail', async () => {
    setCheckInList(populatedCheckIns);
    renderCheckIns();
    expect(
      await screen.findByText(clientCheckInsCopy.status.draft, {}, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientCheckInsCopy.status.waitingReview)).toBeInTheDocument();
    expect(screen.getByText(clientCheckInsCopy.status.reviewed)).toBeInTheDocument();
    expect(screen.queryByText('Keep the current volume. Sleep looks solid.')).not.toBeInTheDocument();
    expect(screen.queryByText('t1111111-tttt-4111-8111-t11111111111')).not.toBeInTheDocument();
  });

  it('creates a draft from the period form and opens detail', async () => {
    const user = userEvent.setup();
    checkInMockState.items = [];
    renderCheckIns();
    await screen.findByRole('heading', { name: clientCheckInsCopy.current.emptyTitle }, { timeout });
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.current.start }));
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.create.submit }));
    expect(checkInMockState.lastCreatePayload?.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(checkInMockState.lastCreatePayload?.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      await screen.findByRole('button', { name: clientCheckInsCopy.form.submit }, { timeout }),
    ).toBeInTheDocument();
  });

  it('populates a draft and submits the generated payload once', async () => {
    const user = userEvent.setup();
    setCheckInList(populatedCheckIns);
    renderCheckIns(`/client/check-ins/${DRAFT_CHECK_IN_ID}`);
    expect(await screen.findByLabelText(/Training adherence/, {}, { timeout })).toHaveValue('80');
    expect(screen.getByRole('button', { name: 'Sleep 4' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Energy 5' }));
    await user.clear(screen.getByLabelText(/Nutrition adherence/));
    await user.type(screen.getByLabelText(/Nutrition adherence/), '62.5');
    const submit = screen.getByRole('button', { name: clientCheckInsCopy.form.submit });
    await user.click(submit);
    await user.click(submit);

    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.review.waiting }, { timeout }),
    ).toBeInTheDocument();
    expect(checkInMockState.submitCount).toBe(1);
    expect(checkInMockState.lastStatusPayload).toEqual({ status: 'SUBMITTED' });
    expect(checkInMockState.lastUpdatePayload?.energyLevel).toBe(5);
    expect(checkInMockState.lastUpdatePayload?.nutritionAdherencePct).toBe(62.5);
    expect(checkInMockState.lastUpdatePayload?.trainingAdherencePct).toBe(80);
    expect(screen.queryByRole('button', { name: clientCheckInsCopy.form.submit })).not.toBeInTheDocument();
  });

  it('does not submit an empty draft', async () => {
    const user = userEvent.setup();
    setCheckInList([partialCheckIn]);
    renderCheckIns(`/client/check-ins/${partialCheckIn.id}`);
    await screen.findByRole('button', { name: clientCheckInsCopy.form.submit }, { timeout });
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.form.submit }));
    expect(await screen.findByText(clientCheckInsCopy.form.needResponse)).toBeInTheDocument();
    expect(checkInMockState.submitCount).toBe(0);
  });

  it('preserves 0 and 62.5 on save', async () => {
    const user = userEvent.setup();
    setCheckInList([zeroAdherenceCheckIn]);
    renderCheckIns(`/client/check-ins/${zeroAdherenceCheckIn.id}`);
    expect(await screen.findByLabelText(/Training adherence/, {}, { timeout })).toHaveValue('0');
    expect(screen.getByLabelText(/Nutrition adherence/)).toHaveValue('62.5');
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.form.saveDraft }));
    await waitFor(() => {
      expect(checkInMockState.lastUpdatePayload?.trainingAdherencePct).toBe(0);
      expect(checkInMockState.lastUpdatePayload?.nutritionAdherencePct).toBe(62.5);
    });
    expect(checkInMockState.lastStatusPayload).toBeNull();
  });

  it('renders reviewed feedback as read-only without trainer ids', async () => {
    setCheckInList([reviewedCheckIn]);
    renderCheckIns(`/client/check-ins/${reviewedCheckIn.id}`);
    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.review.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keep the current volume. Sleep looks solid.')).toBeInTheDocument();
    expect(screen.getByText('Hold calories this week.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: clientCheckInsCopy.form.submit })).not.toBeInTheDocument();
    expect(screen.queryByText(reviewedCheckIn.review?.reviewedByUserId ?? 'missing')).not.toBeInTheDocument();
    expect(screen.queryByText(reviewedCheckIn.review?.id ?? 'missing')).not.toBeInTheDocument();
  });

  it('keeps submitted check-ins read-only with waiting copy', async () => {
    setCheckInList([submittedCheckIn]);
    renderCheckIns(`/client/check-ins/${submittedCheckIn.id}`);
    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.review.waiting }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: clientCheckInsCopy.form.submit })).not.toBeInTheDocument();
  });

  it('maps 409 without exposing the raw conflict', async () => {
    const user = userEvent.setup();
    checkInMockState.items = [];
    checkInMockState.createStatus = 409;
    renderCheckIns();
    await screen.findByRole('heading', { name: clientCheckInsCopy.current.emptyTitle }, { timeout });
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.current.start }));
    await user.click(screen.getByRole('button', { name: clientCheckInsCopy.create.submit }));
    expect(await screen.findByText(clientCheckInsCopy.error.conflict)).toBeInTheDocument();
    expect(screen.queryByText('Duplicate period internals')).not.toBeInTheDocument();
  });

  it('maps 403 without leaking internals', async () => {
    checkInMockState.listStatus = 403;
    renderCheckIns();
    expect(await screen.findByText(clientCheckInsCopy.error.forbidden, {}, { timeout })).toBeInTheDocument();
    expect(screen.queryByText('List failed')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Main/i })).toBeInTheDocument();
  });

  it('keeps a network error inside the shell', async () => {
    checkInMockState.failNetwork = true;
    renderCheckIns();
    expect(await screen.findByText(clientCheckInsCopy.error.network, {}, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Main/i })).toBeInTheDocument();
  });

  it('reaches check-ins from the dashboard CTA', async () => {
    const user = userEvent.setup();
    dashboardMockState.body = populatedClientDashboard;
    setCheckInList(populatedCheckIns);
    renderCheckIns('/client/dashboard');
    const cta = await screen.findByRole('link', {
      name: clientDashboardCopy.checkIn.viewCheckIns,
    }, { timeout });
    expect(cta).toHaveAttribute('href', '/client/check-ins');
    await user.click(cta);
    expect(
      await screen.findByRole('heading', { name: clientCheckInsCopy.title }, { timeout }),
    ).toBeInTheDocument();
  });
});
