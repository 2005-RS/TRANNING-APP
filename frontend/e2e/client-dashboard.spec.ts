import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const dashboardBody = {
  periodDays: 7,
  trainingPlan: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Hypertrophy block 4',
    startDate: '2026-09-01',
    endDate: '2026-10-12',
    workoutCount: 4,
  },
  nutritionPlan: null,
  currentWorkoutSession: {
    sessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    workoutName: 'Lower A',
    startedAt: '2026-09-04T14:05:00.000Z',
    exerciseCount: 6,
    recordedSetCount: 8,
  },
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
};

const inProgressSession = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  trainingPlanId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sourceTrainingPlanWorkoutId: '11111111-aaaa-4111-8111-111111111111',
  workoutName: 'Lower A',
  workoutDescription: null,
  scheduledDay: 'MONDAY',
  status: 'IN_PROGRESS',
  startedAt: '2026-09-04T14:05:00.000Z',
  completedAt: null,
  cancelledAt: null,
  createdAt: '2026-09-04T14:05:00.000Z',
  updatedAt: '2026-09-04T14:05:00.000Z',
  exercises: [
    {
      id: 'e1111111-e111-4111-8111-e11111111111',
      sourceTrainingPlanExerciseId: '33333333-aaaa-4111-8111-333333333333',
      exerciseId: '77777777-dddd-4ddd-8ddd-777777777777',
      exerciseName: 'Back squat',
      position: 1,
      prescription: {
        sets: 4,
        type: 'REPS',
        repsMin: 8,
        repsMax: 10,
        durationSeconds: null,
        restSeconds: 90,
        targetLoadKg: 80,
        targetRpe: null,
        targetRir: null,
        tempo: null,
        notes: null,
      },
      sets: [],
    },
  ],
};

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
      body: JSON.stringify(dashboardBody),
    });
  });

  await page.route('**/api/v1/clients/me/workout-sessions/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workoutSession: inProgressSession }),
    });
  });

  await page.route(
    '**/api/v1/clients/me/workout-sessions/cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(inProgressSession),
      });
    },
  );
}

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('client dashboard', () => {
  test('authenticated client opens home and continues to training', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedClient(page);
    await page.goto('/client/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening), Ada/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: 'Continue training' }).click();
    await expect(page).toHaveURL(/\/client\/workout\/cccccccc-cccc-4ccc-8ccc-cccccccccccc$/);
    await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });

  test('real backend dashboard smoke', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_EMAIL and E2E_PASSWORD for a real CLIENT dashboard round-trip. Do not commit credentials.',
    );

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
