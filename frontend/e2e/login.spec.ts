import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

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

test.describe('login smoke', () => {
  test('opens the login screen', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('anonymous nested protected route keeps a safe return-to', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/client/progress', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
      timeout: 20_000,
    });
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('redirect=');
  });

  test('unknown route offers sign in when anonymous', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/does-not-exist', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: 'Go to sign in' })).toBeVisible();
  });

  test('hung refresh shows a recoverable restore state instead of login', async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', async () => {
      await new Promise(() => undefined);
    });

    await page.goto('/client/progress', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Unable to restore your session.' }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to sign in' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toHaveCount(0);
  });

  test('restore retry after a hung refresh can reach sign-in by choice', async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', async () => {
      await new Promise(() => undefined);
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Unable to restore your session.' }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Go to sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  });

  test('retries a hung refresh and restores the session', async ({ page }) => {
    let refreshCalls = 0;
    const clientUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'client.a@example.test',
      firstName: 'Ada',
      lastName: 'Client',
      role: 'CLIENT',
    };

    await page.route('**/api/v1/auth/refresh', async (route) => {
      refreshCalls += 1;
      if (refreshCalls === 1) {
        await new Promise(() => undefined);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-access-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: clientUser,
        }),
      });
    });
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(clientUser),
      });
    });
    await page.route('**/api/v1/clients/me/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          periodDays: 7,
          trainingPlan: null,
          nutritionPlan: null,
          currentWorkoutSession: null,
          recentTraining: { completedSessions: [] },
          performance: {
            completedSessions: 0,
            performedSets: 0,
            totalReps: 0,
            externalLoadVolumeKg: 0,
            totalDurationSeconds: 0,
            exercisesPerformed: 0,
          },
          bodyProgress: null,
          checkIn: null,
          notifications: { unreadCount: 0 },
        }),
      });
    });

    await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Unable to restore your session.' }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('heading', { name: /Ada/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('signs in and out when credentials are provided', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a full auth round-trip. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
