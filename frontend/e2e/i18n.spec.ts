import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const trainerUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'trainer.a@example.test',
  firstName: 'Tess',
  lastName: 'Trainer',
  role: 'TRAINER',
};

async function mockAnonymousSession(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
    });
  });
}

async function mockAuthenticatedClient(page: Page) {
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
}

async function mockAuthenticatedTrainer(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-trainer-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: trainerUser,
      }),
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(trainerUser),
    });
  });
  await page.route('**/api/v1/trainers/me/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        activeClientCount: 0,
        disabledAssignedClientCount: 0,
        pendingCheckIns: { count: 0, items: [] },
        clientsWithoutRecentTraining: { inactivityDays: 7, count: 0, items: [] },
        clientsWithoutActiveTrainingPlan: { count: 0, items: [] },
        clientsWithoutActiveNutritionPlan: { count: 0, items: [] },
        recentCompletedSessions: [],
        notifications: { unreadCount: 0 },
      }),
    });
  });
  await page.route('**/api/v1/workout-templates**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 't1111111-t111-4111-8111-t11111111111',
            name: 'Push Strength',
            description: null,
            status: 'ACTIVE',
            createdByUserId: trainerUser.id,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-04T00:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      }),
    });
  });
}

async function switchToSpanish(page: Page) {
  await page.locator('[data-testid="language-switcher"]:visible').click();
  await page.getByRole('menuitemradio', { name: 'Español' }).click();
}

async function switchToEnglish(page: Page) {
  await page.locator('[data-testid="language-switcher"]:visible').click();
  await page.getByRole('menuitemradio', { name: 'English' }).click();
}

test.describe('internationalization', () => {
  test('login switches English to Spanish without authentication', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await switchToSpanish(page);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(page.url()).toContain('/login');
  });

  test('client navigation follows the language switch immediately', async ({ page }) => {
    await mockAuthenticatedClient(page);
    await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible({ timeout: 20_000 });
    await switchToSpanish(page);
    await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrenamiento' })).toBeVisible();
    await switchToEnglish(page);
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Training' })).toBeVisible();
  });

  test('trainer training chrome translates and language switch does not mutate', async ({ page }) => {
    const mutating: string[] = [];
    page.on('request', (request) => {
      const method = request.method();
      if (
        request.url().includes('/api/v1/') &&
        method !== 'GET' &&
        method !== 'HEAD' &&
        method !== 'OPTIONS'
      ) {
        mutating.push(`${method} ${request.url()}`);
      }
    });
    await mockAuthenticatedTrainer(page);
    await page.goto('/trainer/training', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'New template' })).toBeVisible();
    await expect(page.getByText('Push Strength')).toBeVisible();
    const before = mutating.length;
    await switchToSpanish(page);
    await expect(page.getByRole('heading', { name: 'Entrenamiento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva plantilla' })).toBeVisible();
    await expect(page.getByText('Push Strength')).toBeVisible();
    expect(mutating.slice(before)).toEqual([]);
  });
});
