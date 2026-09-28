import { expect, test, type Page } from '@playwright/test';

async function mockAnonymousSession(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
    });
  });
}

function traceField(page: Page) {
  return page.locator('[data-slot="trace-field"]');
}

async function openHome(page: Page) {
  await mockAnonymousSession(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Train with precision.' })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('public site ambient field', () => {
  test('animates the home hero with WebGL', async ({ page }) => {
    await openHome(page);
    await expect(traceField(page)).toHaveAttribute('data-state', 'running');
  });

  test('pauses once the hero scrolls out of view', async ({ page }) => {
    await openHome(page);
    await expect(traceField(page)).toHaveAttribute('data-state', 'running');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(traceField(page)).toHaveAttribute('data-state', 'paused');

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(traceField(page)).toHaveAttribute('data-state', 'running');
  });

  test('keeps the other public pages on the static atmosphere', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/platform', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(traceField(page)).toHaveCount(0);
  });

  test('animates the desktop login hero', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 20_000 });
    await expect(traceField(page)).toHaveAttribute('data-state', 'running');
  });

  test('never starts WebGL for the hidden login hero on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAnonymousSession(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 20_000 });
    await expect(traceField(page)).toHaveCount(1);
    await page.waitForLoadState('networkidle');
    await expect(traceField(page)).not.toHaveAttribute('data-state');
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`fits a ${width}px screen without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openHome(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('public site ambient field with reduced motion', () => {
  // reducedMotion is a context option; a top-level `use` key is silently ignored.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('draws one still frame instead of animating', async ({ page }) => {
    await openHome(page);
    await expect(traceField(page)).toHaveAttribute('data-state', 'still');
  });
});
