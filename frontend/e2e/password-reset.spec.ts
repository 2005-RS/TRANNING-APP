import { expect, test, type Page, type Route } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

const TOKEN = `0b6f3d2e-5c1a-4f7e-9a3b-2d4c6e8f0a1b.${'A'.repeat(43)}`;

async function fulfillError(route: Route, statusCode: number, message: string) {
  await route.fulfill({
    status: statusCode,
    contentType: 'application/json',
    body: JSON.stringify({
      statusCode,
      code: statusCode === 401 ? 'UNAUTHORIZED' : 'NOT_FOUND',
      message,
      path: new URL(route.request().url()).pathname,
      timestamp: '2026-09-30T00:00:00.000Z',
      requestId: 'req-e2e-reset',
    }),
  });
}

/** Anonymous visitor; every API call is mocked so a local backend is never reached. */
async function mockAnonymous(page: Page) {
  const calls = { forgot: [] as unknown[], reset: [] as unknown[] };
  await page.route('**/api/v1/**', (route) => fulfillError(route, 404, 'Not mocked'));
  await page.route('**/api/v1/auth/refresh', (route) => fulfillError(route, 401, 'No session'));
  await page.route('**/api/v1/auth/forgot-password', async (route) => {
    calls.forgot.push(route.request().postDataJSON());
    await route.fulfill({ status: 202 });
  });
  await page.route('**/api/v1/auth/reset-password', async (route) => {
    calls.reset.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  return calls;
}

test.describe('password reset', () => {
  test('requests a link from the sign-in page', async ({ page }) => {
    const calls = await mockAnonymous(page);
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot your password?' }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expectNoSeriousA11yViolations(page, 'forgot password');

    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    expect(calls.forgot).toEqual([{ email: 'someone@example.com' }]);
  });

  test('sets a new password from the emailed link and drops the token from the URL', async ({
    page,
  }) => {
    const calls = await mockAnonymous(page);
    await page.goto(`/reset-password#token=${TOKEN}`);

    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await expect.poll(() => new URL(page.url()).hash).toBe('');
    await expectNoSeriousA11yViolations(page, 'reset password');

    await page.getByLabel('New password', { exact: true }).fill('a-new-long-password');
    await page.getByLabel('Confirm new password').fill('a-new-long-password');
    await page.getByRole('button', { name: 'Save new password' }).click();

    await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
    expect(calls.reset).toEqual([{ token: TOKEN, password: 'a-new-long-password' }]);
  });

  test('explains a link without a token', async ({ page }) => {
    await mockAnonymous(page);
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'This link cannot be used' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  });
});
