import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const pixel =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const measurements = {
  data: [
    {
      id: 'b1111111-bbbb-4111-8111-b11111111111',
      measuredAt: '2026-09-03T08:00:00.000Z',
      bodyWeightKg: 81.25,
      bodyFatPercentage: 16.5,
      waistCm: 81.2,
      notes: null,
      createdAt: '2026-09-03T08:00:00.000Z',
      updatedAt: '2026-09-03T08:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
};

const emptyList = {
  data: [],
  meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
};

const photos = {
  data: [
    {
      id: 'p1111111-aaaa-4111-8111-p11111111111',
      pose: 'FRONT',
      status: 'READY',
      mimeType: 'image/jpeg',
      fileSizeBytes: 2400,
      capturedAt: '2026-08-01T12:00:00.000Z',
      bodyMeasurementId: null,
      finalizedAt: '2026-08-01T12:01:00.000Z',
      createdAt: '2026-08-01T12:00:00.000Z',
    },
    {
      id: 'p2222222-aaaa-4111-8111-p22222222222',
      pose: 'SIDE',
      status: 'READY',
      mimeType: 'image/jpeg',
      fileSizeBytes: 2600,
      capturedAt: '2026-09-03T12:00:00.000Z',
      bodyMeasurementId: null,
      finalizedAt: '2026-09-03T12:01:00.000Z',
      createdAt: '2026-09-03T12:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
};

async function mockAuthenticatedBody(
  page: Page,
  options: { measurements?: typeof measurements | typeof emptyList; photos?: typeof photos | typeof emptyList } = {},
) {
  const measurementBody = options.measurements ?? measurements;
  const photoBody = options.photos ?? photos;

  await page.route('**/api/v1/auth/refresh', async (route) => {
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

  await page.route('**/api/v1/clients/me/body-measurements**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(measurementBody),
    });
  });

  await page.route('**/api/v1/clients/me/progress-photos/*/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: pixel,
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/v1/clients/me/progress-photos**', async (route) => {
    const url = route.request().url();
    if (url.includes('/access')) {
      await route.fallback();
      return;
    }
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const status = new URL(url).searchParams.get('status');
    const body = status === 'READY' || !status ? photoBody : emptyList;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('client body progress', () => {
  test('authenticated client opens body progress and sees measurements and photos', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedBody(page);
    await page.goto('/client/body', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Body progress' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('81.25 kg')).toBeVisible();
    await expect(page.getByText('81.2 cm')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Compare' })).toBeVisible();
  });

  test('no measurements shows an honest empty state', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedBody(page, { measurements: emptyList, photos: emptyList });
    await page.goto('/client/body', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(
      page.getByRole('heading', { name: 'No measurements yet.' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('0 kg')).toHaveCount(0);
  });

  const viewports = [320, 375, 430, 768, 1024, 1440] as const;

  for (const width of viewports) {
    test(`body progress layout does not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 844 });
      await mockAuthenticatedBody(page);
      await page.goto('/client/body', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(page.getByRole('heading', { name: 'Body progress' })).toBeVisible({
        timeout: 20_000,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('real backend body progress smoke', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a real CLIENT body read. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/client/body', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
