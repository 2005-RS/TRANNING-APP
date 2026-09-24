import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const squatId = '77777777-dddd-4ddd-8ddd-777777777777';

const summary = {
  completedSessions: 8,
  performedSets: 64,
  exercisesPerformed: 6,
  totalReps: 512,
  externalLoadVolumeKg: 18450.4,
  totalDurationSeconds: 900,
  firstCompletedSessionAt: '2026-08-08T10:00:00.000Z',
  lastCompletedSessionAt: '2026-09-03T18:30:00.000Z',
};

const exercises = {
  data: [
    {
      exerciseId: squatId,
      exerciseName: 'Back squat',
      exerciseStatus: 'ACTIVE',
      prescriptionType: 'REPS',
      completedSessions: 4,
      performedSets: 16,
      totalReps: 128,
      externalLoadVolumeKg: 10240,
      bestLoadKg: 100,
      bestReps: 10,
      bestEstimated1RmKg: 133.3,
      firstPerformedAt: '2026-08-10T10:00:00.000Z',
      lastPerformedAt: '2026-09-03T18:30:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
};

const body = {
  data: [
    {
      id: 'b1111111-bbbb-4111-8111-b11111111111',
      measuredAt: '2026-09-03T08:00:00.000Z',
      bodyWeightKg: 81,
      waistCm: 81.2,
      createdAt: '2026-09-03T08:00:00.000Z',
      updatedAt: '2026-09-03T08:00:00.000Z',
    },
    {
      id: 'b2222222-bbbb-4111-8111-b22222222222',
      measuredAt: '2026-08-12T08:00:00.000Z',
      bodyWeightKg: 82.4,
      waistCm: 82,
      createdAt: '2026-08-12T08:00:00.000Z',
      updatedAt: '2026-08-12T08:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 60, totalItems: 2, totalPages: 1 },
};

const detail = {
  exerciseId: squatId,
  exerciseName: 'Back squat',
  exerciseStatus: 'ACTIVE',
  availablePrescriptionTypes: ['REPS'],
  reps: {
    prescriptionType: 'REPS',
    completedSessions: 4,
    performedSets: 16,
    totalReps: 128,
    externalLoadVolumeKg: 10240,
    bestLoadKg: 100,
    bestReps: 10,
    bestEstimated1RmKg: 133.3,
    firstPerformedAt: '2026-08-10T10:00:00.000Z',
    lastPerformedAt: '2026-09-03T18:30:00.000Z',
    bestLoad: {
      value: 100,
      workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      performedAt: '2026-09-03T18:30:00.000Z',
      setNumber: 2,
    },
    history: {
      data: [
        {
          workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          workoutName: 'Lower A',
          performedAt: '2026-09-03T18:30:00.000Z',
          exerciseNameSnapshot: 'Back squat',
          sessionExternalLoadVolumeKg: 3200,
          occurrences: [
            {
              workoutSessionExerciseId: 'e1111111-e111-4111-8111-e11111111111',
              position: 1,
              exerciseNameSnapshot: 'Back squat',
              sets: [
                {
                  id: 's1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  setNumber: 1,
                  actualReps: 8,
                  actualLoadKg: 90,
                },
              ],
            },
          ],
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    },
    trend: [
      {
        performedAt: '2026-08-10T10:00:00.000Z',
        workoutSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bestLoadKg: 90,
        externalLoadVolumeKg: 2160,
        totalReps: 24,
      },
      {
        performedAt: '2026-09-03T18:30:00.000Z',
        workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        bestLoadKg: 100,
        externalLoadVolumeKg: 3200,
        totalReps: 18,
      },
    ],
  },
  duration: null,
};

async function mockAuthenticatedProgress(page: Page) {
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

  await page.route('**/api/v1/clients/me/progress/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    });
  });

  await page.route('**/api/v1/clients/me/progress/exercises**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isDetail = /\/progress\/exercises\/[^/]+$/.test(pathname);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isDetail ? detail : exercises),
    });
  });

  await page.route('**/api/v1/clients/me/body-measurements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('client progress', () => {
  test('authenticated client opens progress, changes period, and opens exercise detail', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedProgress(page);
    await page.goto('/client/progress?period=30', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('18450 kg')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Progress', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.getByRole('button', { name: 'Last 7 days' }).click();
    await expect(page).toHaveURL(/period=7/);

    await page.getByRole('link', { name: /Back squat/ }).click();
    await expect(page).toHaveURL(new RegExp(`/client/progress/exercises/${squatId}`));
    await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Progress', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('real backend progress smoke', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a real CLIENT progress round-trip. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/client/progress', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
