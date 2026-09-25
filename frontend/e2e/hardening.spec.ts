import { expect, test, type Page } from '@playwright/test';

async function mockAnonymousSession(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 401,
        message: 'Unauthorized',
      }),
    });
  });
}

test.describe('production hardening smoke', () => {
  test('login exposes a skip link and never writes an access token to web storage', async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );

    const stored = await page.evaluate(() => ({
      local: window.localStorage,
      session: window.sessionStorage,
    }));
    expect(JSON.stringify(stored)).not.toMatch(/eyJ|accessToken|Bearer /i);
  });
});
