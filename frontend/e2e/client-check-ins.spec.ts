import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const draft = {
  id: 'c1111111-cccc-4111-8111-c11111111111',
  periodStart: '2026-08-25',
  periodEnd: '2026-08-31',
  status: 'DRAFT',
  responses: {
    sleepQuality: 4,
    energyLevel: 3,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: 2,
    trainingAdherencePct: 80,
    nutritionAdherencePct: null,
    wins: 'Hit every session.',
    challenges: null,
    generalNotes: null,
  },
  submittedAt: null,
  review: null,
  createdAt: '2026-09-05T12:00:00.000Z',
  updatedAt: '2026-09-05T12:00:00.000Z',
};

function summary(item: typeof draft & { status: string; submittedAt: string | null }) {
  return {
    id: item.id,
    periodStart: item.periodStart,
    periodEnd: item.periodEnd,
    status: item.status,
    submittedAt: item.submittedAt,
    hasReview: item.status === 'REVIEWED',
    createdAt: item.createdAt,
  };
}

async function mockAuthenticatedCheckIns(page: Page) {
  let current = { ...draft, responses: { ...draft.responses } };

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
        checkIn: {
          id: current.id,
          periodStart: current.periodStart,
          periodEnd: current.periodEnd,
          status: current.status,
          submittedAt: current.submittedAt,
          hasReview: false,
          reviewedAt: null,
        },
        notifications: { unreadCount: 0 },
      }),
    });
  });

  await page.route('**/api/v1/clients/me/check-ins**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [summary(current)],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      }),
    });
  });

  await page.route('**/api/v1/clients/me/check-ins/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      current = {
        ...current,
        periodStart: typeof payload.periodStart === 'string' ? payload.periodStart : current.periodStart,
        periodEnd: typeof payload.periodEnd === 'string' ? payload.periodEnd : current.periodEnd,
        responses: {
          ...current.responses,
          ...payload,
        },
        updatedAt: '2026-09-05T12:30:00.000Z',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(current),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(current),
    });
  });

  await page.route('**/api/v1/clients/me/check-ins/*/status', async (route) => {
    current = {
      ...current,
      status: 'SUBMITTED',
      submittedAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(current),
    });
  });
}

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('client check-ins', () => {
  test('authenticated client opens check-ins, continues a draft, and submits', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedCheckIns(page);
    await page.goto('/client/check-ins', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Draft in progress')).toBeVisible();
    await page.getByRole('link', { name: 'Continue check-in' }).click();
    await expect(page.getByRole('button', { name: 'Submit check-in' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel('Training adherence')).toHaveValue('80');
    await page.getByRole('button', { name: 'Submit check-in' }).click();
    await expect(page.getByRole('heading', { name: 'Waiting for review' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Submit check-in' })).toHaveCount(0);
  });

  test('dashboard check-in CTA lands on check-ins', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedCheckIns(page);
    await page.goto('/client/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.getByRole('link', { name: 'View check-ins' }).click();
    await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible({
      timeout: 20_000,
    });
  });

  const viewports = [320, 375, 430, 768, 1024, 1440] as const;

  for (const width of viewports) {
    test(`check-ins layout does not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 844 });
      await mockAuthenticatedCheckIns(page);
      await page.goto('/client/check-ins', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible({
        timeout: 20_000,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('real backend check-in smoke is read-only', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a real CLIENT check-in read. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/client/check-ins', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
