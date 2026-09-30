import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const currentPlan = {
  nutritionPlan: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Performance meals',
    description: 'Weekday eating for the hypertrophy block.',
    status: 'ACTIVE',
    startDate: '2026-09-01',
    endDate: null,
    targets: {
      caloriesKcal: 2450,
      proteinG: 180,
      carbohydratesG: 260,
      fatG: 70,
    },
    clientProfileId: '11111111-cccc-4111-8111-111111111111',
    createdByUserId: '22222222-tttt-4111-8111-222222222222',
    activatedAt: '2026-09-01T08:00:00.000Z',
    archivedAt: null,
    createdAt: '2026-08-28T10:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    mealPlanTotals: {
      caloriesKcal: 2380.5,
      proteinG: 178,
      carbohydratesG: 246,
      fatG: 68,
      fiberG: 32,
    },
    targetDifferences: {
      caloriesDifferenceKcal: -69.5,
      proteinDifferenceG: -2,
      carbohydratesDifferenceG: -14,
      fatDifferenceG: -2,
    },
    meals: [
      {
        id: 'm1111111-aaaa-4111-8111-m11111111111',
        name: 'Morning plate',
        mealType: 'BREAKFAST',
        position: 1,
        notes: null,
        totals: {
          caloriesKcal: 620,
          proteinG: 42,
          carbohydratesG: 68,
          fatG: 18,
          fiberG: 8,
        },
        items: [
          {
            id: 'i2222222-aaaa-4111-8111-i22222222222',
            foodId: 'f2222222-ffff-4111-8111-f22222222222',
            foodName: 'Oats',
            brand: null,
            quantityGrams: 62.5,
            nutrition: {
              caloriesKcal: 240,
              proteinG: 8,
              carbohydratesG: 40,
              fatG: 4,
              fiberG: 6,
            },
            position: 1,
            notes: null,
          },
        ],
      },
    ],
  },
};

async function mockAuthenticatedNutrition(
  page: Page,
  body: typeof currentPlan | { nutritionPlan: null } = currentPlan,
) {
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

  await page.route('**/api/v1/clients/me/nutrition-plans/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route('**/api/v1/clients/me/nutrition-journal/days/*', async (route) => {
    const date = route.request().url().split('/').pop() ?? '2026-09-30';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(journalDay(date)),
    });
  });
}

function journalDay(date: string) {
  const emptyMeal = (mealType: string) => ({
    mealType,
    plannedItems: [],
    extraEntries: [],
    plannedCaloriesKcal: 0,
    consumedCaloriesKcal: 0,
  });
  return {
    date,
    plan: { id: 'plan-1', name: 'Performance meals' },
    targets: { caloriesKcal: 2450, proteinG: 180, carbohydratesG: 260, fatG: 70 },
    planned: { caloriesKcal: 311.2, proteinG: 13.5, carbohydratesG: 53, fatG: 5.5, fiberG: 8.5 },
    consumed: { caloriesKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0 },
    remainingCaloriesKcal: 2450,
    adherence: { plannedItems: 1, eaten: 0, replaced: 0, skipped: 0, pending: 1 },
    editable: true,
    meals: [
      {
        mealType: 'BREAKFAST',
        plannedItems: [
          {
            planItemId: '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a',
            planMealName: 'Morning plate',
            foodId: '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a',
            foodName: 'Oats',
            brand: null,
            quantityGrams: 80,
            nutrition: { caloriesKcal: 311.2, proteinG: 13.5, carbohydratesG: 53, fatG: 5.5, fiberG: 8.5 },
            status: 'PENDING',
            entry: null,
          },
        ],
        extraEntries: [],
        plannedCaloriesKcal: 311.2,
        consumedCaloriesKcal: 0,
      },
      emptyMeal('LUNCH'),
      emptyMeal('DINNER'),
      emptyMeal('SNACK'),
      emptyMeal('OTHER'),
    ],
  };
}

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('client nutrition', () => {
  test('authenticated client opens today and logs against the prescribed plan', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedNutrition(page);
    await page.goto('/client/nutrition', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('button', { name: 'Add food' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('meter', { name: 'Calories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'I ate it: Oats' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('authenticated client opens the full plan', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedNutrition(page);
    await page.goto('/client/nutrition/plan', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Performance meals' })).toBeVisible();
    await expect(page.getByText('Oats')).toBeVisible();
    await expect(page.getByText('62.5 g')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('no assigned plan shows an honest empty state', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedNutrition(page, { nutritionPlan: null });
    await page.goto('/client/nutrition/plan', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(
      page.getByRole('heading', { name: 'No nutrition plan is assigned yet.' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  const viewports = [320, 375, 430, 768, 1024, 1440] as const;

  for (const width of viewports) {
    test(`nutrition layout does not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 844 });
      await mockAuthenticatedNutrition(page);
      await page.goto('/client/nutrition/plan', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(page.getByRole('heading', { name: 'Performance meals' })).toBeVisible({
        timeout: 20_000,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await page.goto('/client/nutrition', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: 'Add food' })).toBeVisible({
        timeout: 20_000,
      });
      const todayOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(todayOverflow).toBeLessThanOrEqual(1);
    });
  }

  test('real backend nutrition smoke', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a real CLIENT nutrition read. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/client/nutrition', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
