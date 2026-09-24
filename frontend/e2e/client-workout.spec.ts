import { expect, test, type Page } from '@playwright/test';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const sessionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const squatExerciseId = 'e1111111-e111-4111-8111-e11111111111';

function createSession(sets: Array<{ actualReps: number; actualLoadKg: number }>) {
  return {
    id: sessionId,
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
        id: squatExerciseId,
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
        demonstrationMedia: {
          id: 'mda11111-mda1-4111-8111-mda111111111',
          mediaType: 'VIDEO',
          originalFileName: 'back-squat.mp4',
          mimeType: 'video/mp4',
          fileSizeBytes: 48_000,
          status: 'READY',
          displayOrder: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          finalizedAt: '2026-01-01T00:00:00.000Z',
        },
        sets: sets.map((set, index) => ({
          id: `${String(index + 1).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
          setNumber: index + 1,
          actualReps: set.actualReps,
          actualLoadKg: set.actualLoadKg,
          actualDurationSeconds: null,
          actualRpe: null,
          actualRir: null,
          notes: null,
        })),
      },
    ],
  };
}

async function mockClientWorkout(page: Page) {
  let session = createSession([]);

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
        trainingPlan: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'Hypertrophy block 4',
          workoutCount: 2,
        },
        nutritionPlan: null,
        currentWorkoutSession: {
          sessionId,
          workoutName: 'Lower A',
          startedAt: '2026-09-04T14:05:00.000Z',
          exerciseCount: 1,
          recordedSetCount: session.exercises[0]?.sets.length ?? 0,
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
      }),
    });
  });

  await page.route('**/api/v1/clients/me/workout-sessions/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workoutSession: session }),
    });
  });

  await page.route(
    `**/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${squatExerciseId}/sets`,
    async (route) => {
      const posted = route.request().postDataJSON() as {
        sets: Array<{ actualReps: number; actualLoadKg: number }>;
      };
      session = createSession(posted.sets);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
    },
  );

  await page.route(`**/api/v1/clients/me/workout-sessions/${sessionId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });

  await page.route('**/api/v1/exercises/**/media/**/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://signed.example.test/exercise-media',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
  });

  await page.route('https://signed.example.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'video/mp4',
      body: Buffer.alloc(64),
    });
  });
}

test.describe('client workout', () => {
  test('logs a set in focus mode and shows rest remaining', async ({ page }) => {
    test.setTimeout(45_000);
    await mockClientWorkout(page);
    await page.goto(`/client/workout/${sessionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Load (kg)' })).toHaveValue('80');
    await expect(page.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');

    await page.getByRole('button', { name: 'Log set' }).click();
    await expect(page.getByRole('timer')).toHaveAccessibleName('Rest remaining 1:30');
    await expect(page.getByText('1:30')).toBeVisible();
    await expect(page.getByText('1 / 4')).toBeVisible();
  });

  test('shows a demonstration without blocking set logging', async ({ page }) => {
    test.setTimeout(45_000);
    await mockClientWorkout(page);
    await page.goto(`/client/workout/${sessionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('button', { name: /Play demonstration|Pause demonstration|Retry/ }),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Reps' })).toBeEnabled();
    await page.getByRole('button', { name: 'Log set' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
  });

  test('keeps set logging usable when signed media access fails', async ({ page }) => {
    test.setTimeout(45_000);
    await mockClientWorkout(page);
    await page.route('**/api/v1/exercises/**/media/**/access', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Forbidden',
          path: '/api/v1/exercises/media/access',
          timestamp: '2026-09-07T00:00:00.000Z',
          requestId: 'e2e-media',
        }),
      });
    });
    await page.goto(`/client/workout/${sessionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('textbox', { name: 'Reps' })).toBeEnabled();
    await page.getByRole('button', { name: 'Log set' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
  });

  test('reduced motion shows an explicit play control and still logs sets', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockClientWorkout(page);
    await page.goto(`/client/workout/${sessionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /Play demonstration/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Reps' })).toBeEnabled();
    await page.getByRole('button', { name: 'Log set' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
  });
});

const focusViewports = [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflowPx = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return (
      Math.max(root.scrollWidth, body.scrollWidth) -
      Math.max(root.clientWidth, body.clientWidth)
    );
  });
  expect(overflowPx).toBeLessThanOrEqual(1);
}

test.describe('client workout focus layout', () => {
  for (const viewport of focusViewports) {
    test(`stays usable at ${viewport.width}px in dark and light`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize(viewport);
      await mockClientWorkout(page);
      await page.goto(`/client/workout/${sessionId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
      await expect(page.locator('table')).toHaveCount(0);

      const load = page.getByRole('textbox', { name: 'Load (kg)' });
      const decrease = page.getByRole('button', { name: 'Decrease Load (kg)' });
      const logSet = page.getByRole('button', { name: 'Log set' });
      await load.scrollIntoViewIfNeeded();
      await expect(load).toBeVisible();
      await expect(decrease).toBeVisible();
      await expect(logSet).toBeVisible();
      await expect(load).toBeEnabled();

      const headerBox = await page.locator('header').first().boundingBox();
      const loadBox = await load.boundingBox();
      expect(headerBox).not.toBeNull();
      expect(loadBox).not.toBeNull();
      if (headerBox && loadBox) {
        expect(loadBox.y + 1).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
      }

      await assertNoHorizontalOverflow(page);

      await page.getByRole('button', { name: /Appearance, Dark/ }).click();
      await expect(page.getByRole('button', { name: /Appearance, Light/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible();
      await expect(load).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }
});
