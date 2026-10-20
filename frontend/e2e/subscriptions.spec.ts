import { expect, test, type Page, type Route } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const adminUser = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'admin.a@example.test',
  firstName: 'Avery',
  lastName: 'Admin',
  role: 'ADMIN',
};

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockSession(page: Page, user: typeof clientUser | typeof adminUser): Promise<void> {
  await page.route('**/api/v1/auth/refresh', (route) => fulfillJson(route, {
    accessToken: 'e2e-subscription-token', tokenType: 'Bearer', expiresIn: 900, user,
  }));
  await page.route('**/api/v1/auth/me', (route) => fulfillJson(route, user));
}

test('client reports a SINPE payment and sees it pending', async ({ page }) => {
  let pending = false;
  await mockSession(page, clientUser);
  await page.route('**/api/v1/clients/me/subscription/payments', async (route) => {
    pending = true;
    await fulfillJson(route, { id: 'payment-1', status: 'PENDING', amountCrc: 10000, reference: 'SINPE-123', paidOn: '2026-10-10', createdAt: '2026-10-10T00:00:00.000Z' }, 201);
  });
  await page.route('**/api/v1/clients/me/subscription', (route) => fulfillJson(route, {
    plan: 'FREE',
    periodDays: 30,
    sinpe: { phone: '88888888', holderName: 'Training App', priceCrc: 10000 },
    pendingPayment: pending ? { id: 'payment-1', status: 'PENDING', amountCrc: 10000, reference: 'SINPE-123', paidOn: '2026-10-10', createdAt: '2026-10-10T00:00:00.000Z' } : null,
    lastRejectedPayment: null,
  }));

  await page.goto('/client/plan', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My plan' })).toBeVisible({ timeout: 20_000 });
  await expectNoSeriousA11yViolations(page, '/client/plan');
  await page.getByLabel('Receipt number').fill('SINPE-123');
  await page.getByRole('button', { name: 'Report payment' }).click();
  await expect(page.getByText('Payment under review')).toBeVisible();
});

test('admin approves the pending payment', async ({ page }) => {
  let approved = false;
  await mockSession(page, adminUser);
  await page.route('**/api/v1/admin/subscription-payments/subscription-payment-1/approve', async (route) => {
    approved = true;
    await fulfillJson(route, { proUntil: '2026-11-10T00:00:00.000Z' });
  });
  await page.route('**/api/v1/admin/subscription-payments**', (route) => route.request().method() !== 'GET' ? route.fallback() : fulfillJson(route, {
    data: [{
      id: 'subscription-payment-1', status: approved ? 'APPROVED' : 'PENDING', amountCrc: 10000,
      reference: 'SINPE-123', paidOn: '2026-10-10', createdAt: '2026-10-10T00:00:00.000Z',
      client: { id: clientUser.id, firstName: 'Ada', lastName: 'Client', email: clientUser.email },
    }],
    meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  }));
  await page.route('**/api/v1/admin/subscriptions/expired-with-trainer**', (route) => fulfillJson(route, {
    data: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
  }));

  await page.goto('/admin/payments', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible({ timeout: 20_000 });
  await expectNoSeriousA11yViolations(page, '/admin/payments');
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog', { name: 'Approve payment?' }).getByRole('button', { name: 'Approve' }).click();
  await expect.poll(() => approved).toBe(true);
});
