import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { adminA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { adminWorkspaceCopy } from '@/features/admin-workspace/copy';
import {
  ADMIN_CLIENT_ID,
  adminHandlers,
  adminMockState,
  resetAdminMockState,
} from '@/features/admin-workspace/tests/msw-admin';

const copy = adminWorkspaceCopy;

function renderAdmin(entry = '/admin/payments') {
  return render(<TestApp initialEntry={entry} status="AUTHENTICATED" user={adminA} />);
}

describe('Admin subscription payments', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAdminMockState();
    resetAuthBootstrap();
    clearAccessToken();
    authServer.use(...adminHandlers);
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('lists pending payments, opens approval, and posts approval', async () => {
    const user = userEvent.setup();
    renderAdmin();

    expect(await screen.findByText('SINPE-123', undefined, { timeout: 10_000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: copy.payments.approve }));
    expect(await screen.findByText(copy.payments.approveBody, { exact: false })).toBeInTheDocument();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: copy.payments.approve }));

    expect(adminMockState.lastApprovedSubscriptionPaymentId).toBe('subscription-payment-1');
  });

  it('requires a reason before rejecting and links expired clients to their detail', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText('SINPE-123', undefined, { timeout: 10_000 });
    expect(screen.getAllByRole('link', { name: /Ada Client/ })[0]).toHaveAttribute(
      'href',
      `/admin/clients/${ADMIN_CLIENT_ID}`,
    );
    await user.click(screen.getByRole('button', { name: copy.payments.reject }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: copy.payments.reject }));
    expect(await screen.findByText(copy.common.checkFields)).toBeInTheDocument();
    await user.type(screen.getByLabelText(copy.payments.rejectReason), 'Duplicate receipt');
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: copy.payments.reject }));

    expect(adminMockState.lastRejectedSubscriptionPayment).toEqual({
      id: 'subscription-payment-1',
      reason: 'Duplicate receipt',
    });
  });

  it('toggles complimentary Pro from the client detail', async () => {
    const user = userEvent.setup();
    renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);

    await screen.findByRole('button', { name: copy.clients.grantComplimentary }, { timeout: 10_000 });
    await user.click(screen.getByRole('button', { name: copy.clients.grantComplimentary }));
    await user.click(screen.getByRole('button', { name: copy.clients.confirmComplimentary }));

    expect(adminMockState.lastComplimentaryValue).toBe(true);
  });
});
