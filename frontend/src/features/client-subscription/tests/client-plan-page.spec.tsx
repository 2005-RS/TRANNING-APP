import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientSubscriptionCopy } from '@/features/client-subscription/copy';

const URL = 'http://localhost:3000/api/v1/clients/me/subscription';
let subscription: Record<string, unknown>;
let reportStatus = 201;

function renderPlan() {
  return render(<TestApp initialEntry="/client/plan" status="AUTHENTICATED" user={clientA} />);
}

function freeSubscription(): Record<string, unknown> {
  return {
    plan: 'FREE',
    periodDays: 30,
    sinpe: { phone: '88888888', holderName: 'Training App', priceCrc: 10000 },
    pendingPayment: null,
    lastRejectedPayment: null,
  };
}

describe('Client plan', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
    subscription = freeSubscription();
    reportStatus = 201;
    authServer.use(
      http.get(URL, () => HttpResponse.json(subscription)),
      http.post(`${URL}/payments`, async () => {
        if (reportStatus >= 400) {
          return HttpResponse.json(
            {
              statusCode: reportStatus,
              message: 'A pending payment already exists',
              path: '/payments',
              timestamp: '',
              requestId: '',
            },
            { status: reportStatus },
          );
        }
        subscription = {
          ...subscription,
          pendingPayment: {
            id: 'payment-1',
            status: 'PENDING',
            amountCrc: 10000,
            reference: 'ABC-123',
            paidOn: '2026-10-10',
            createdAt: '2026-10-10T00:00:00.000Z',
          },
        };
        return HttpResponse.json(subscription.pendingPayment as Record<string, unknown>, { status: 201 });
      }),
    );
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows SINPE information for Free and reports a payment into the pending state', async () => {
    const user = userEvent.setup();
    renderPlan();

    expect(await screen.findByText(/88888888/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: clientSubscriptionCopy.comparisonTitle })).toBeInTheDocument();
    expect(screen.getByText(/Training App/)).toBeInTheDocument();
    expect(screen.getByText(/10,000/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(clientSubscriptionCopy.reference), 'ABC-123');
    await user.click(screen.getByRole('button', { name: clientSubscriptionCopy.submit }));
    expect(await screen.findByText(clientSubscriptionCopy.pending, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: clientSubscriptionCopy.submit })).not.toBeInTheDocument();
  }, 30_000);

  it('handles unavailable, rejected, paid, and complimentary plan states', async () => {
    subscription = { ...freeSubscription(), sinpe: null };
    const first = renderPlan();
    expect(
      await screen.findByText(clientSubscriptionCopy.unavailable, undefined, {
        timeout: 10_000,
      }),
    ).toBeInTheDocument();
    first.unmount();

    subscription = {
      ...freeSubscription(),
      lastRejectedPayment: { rejectionReason: 'Unreadable receipt' },
    };
    const second = renderPlan();
    expect(await screen.findByText(/Unreadable receipt/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getAllByText(/Unreadable receipt/)).toHaveLength(1);
    second.unmount();

    subscription = { ...freeSubscription(), plan: 'PRO', source: 'PAID', proUntil: '2026-11-01T00:00:00.000Z' };
    const third = renderPlan();
    expect(await screen.findByText(/Pro until/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: clientSubscriptionCopy.comparisonTitle })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: clientSubscriptionCopy.includes })).toBeInTheDocument();
    third.unmount();

    subscription = { ...freeSubscription(), plan: 'PRO', source: 'COMPLIMENTARY' };
    renderPlan();
    expect(
      await screen.findByText(clientSubscriptionCopy.complimentary, undefined, {
        timeout: 10_000,
      }),
    ).toBeInTheDocument();
  });
});
