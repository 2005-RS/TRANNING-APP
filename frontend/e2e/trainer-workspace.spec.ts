import { expect, test, type Page } from '@playwright/test';

const trainerUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'trainer.a@example.test',
  firstName: 'Tess',
  lastName: 'Trainer',
  role: 'TRAINER',
};

const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const clientBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const checkInId = 'c1111111-c111-4111-8111-c11111111111';

const dashboard = {
  activeClientCount: 1,
  disabledAssignedClientCount: 0,
  pendingCheckIns: {
    count: 1,
    items: [
      {
        checkInId,
        clientProfileId: clientId,
        clientName: 'Ada Client',
        periodStart: '2026-08-25',
        periodEnd: '2026-08-31',
        submittedAt: '2026-09-01T12:00:00.000Z',
      },
    ],
  },
  clientsWithoutRecentTraining: { inactivityDays: 7, count: 0, items: [] },
  clientsWithoutActiveTrainingPlan: { count: 0, items: [] },
  clientsWithoutActiveNutritionPlan: { count: 0, items: [] },
  recentCompletedSessions: [],
  notifications: { unreadCount: 0 },
};

const clientProfile = {
  id: clientId,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ada@example.test',
    firstName: 'Ada',
    lastName: 'Client',
    role: 'CLIENT',
    status: 'ACTIVE',
  },
  phone: null,
  dateOfBirth: null,
  primaryGoal: 'STRENGTH',
  goalNotes: null,
  experienceLevel: 'INTERMEDIATE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const overview = {
  data: [
    {
      clientProfileId: clientId,
      clientName: 'Ada Client',
      firstName: 'Ada',
      lastName: 'Client',
      hasActiveTrainingPlan: true,
      currentTrainingPlanName: 'Hypertrophy block',
      hasActiveNutritionPlan: true,
      currentNutritionPlanName: 'Performance meals',
      lastCompletedWorkoutAt: '2026-09-04T15:00:00.000Z',
      latestCheckInStatus: 'SUBMITTED',
      latestCheckInPeriodEnd: '2026-08-31',
      hasPendingCheckIn: true,
      latestBodyMeasurementAt: null,
    },
    {
      clientProfileId: clientBId,
      clientName: 'Bea Client',
      firstName: 'Bea',
      lastName: 'Client',
      hasActiveTrainingPlan: false,
      currentTrainingPlanName: null,
      hasActiveNutritionPlan: false,
      currentNutritionPlanName: null,
      lastCompletedWorkoutAt: null,
      latestCheckInStatus: null,
      latestCheckInPeriodEnd: null,
      hasPendingCheckIn: false,
      latestBodyMeasurementAt: null,
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
};

const emptyPage = { data: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } };
const templateId = 't1111111-t111-4111-8111-t11111111111';
const exerciseId = 'e1111111-e111-4111-8111-e11111111111';
const exerciseBId = 'e2222222-e222-4222-8222-e22222222222';
const adminExerciseId = 'e9999999-e999-4999-8999-e99999999999';
const exerciseMediaId = 'mda11111-mda1-4111-8111-mda111111111';
const uploadedMediaId = 'mda22222-mda2-4222-8222-mda222222222';
const signedStorageUrl = 'https://storage.test/exercise-media-upload';

const ownedExercise = {
  id: exerciseId,
  name: 'Bench Press',
  description: null,
  instructions: null,
  primaryMuscleGroup: 'CHEST',
  equipmentType: 'BARBELL',
  difficultyLevel: 'INTERMEDIATE',
  status: 'ACTIVE',
  createdByUserId: trainerUser.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ownedExerciseB = {
  id: exerciseBId,
  name: 'Incline Dumbbell Press',
  description: null,
  instructions: null,
  primaryMuscleGroup: 'CHEST',
  equipmentType: 'DUMBBELL',
  difficultyLevel: 'INTERMEDIATE',
  status: 'ACTIVE',
  createdByUserId: trainerUser.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const adminCatalogExercise = {
  id: adminExerciseId,
  name: 'Vital bench press',
  description: null,
  instructions: null,
  primaryMuscleGroup: 'CHEST',
  equipmentType: 'BARBELL',
  difficultyLevel: 'INTERMEDIATE',
  status: 'ACTIVE',
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const readyImageMedia = {
  id: exerciseMediaId,
  mediaType: 'IMAGE',
  originalFileName: 'bench.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 48_000,
  status: 'READY',
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  finalizedAt: '2026-01-01T00:00:00.000Z',
};

const e2eTemplate = {
  id: templateId,
  name: 'Push Strength',
  description: 'Upper body pressing',
  status: 'ACTIVE',
  createdByUserId: trainerUser.id,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  items: [
    {
      id: 'ti111111-ti11-4111-8111-ti1111111111',
      position: 1,
      exercise: {
        id: exerciseId,
        name: 'Bench Press',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        difficultyLevel: 'INTERMEDIATE',
        status: 'ACTIVE',
      },
      sets: 4,
      prescriptionType: 'REPS',
      repsMin: 8,
      repsMax: 10,
      durationSeconds: null,
      restSeconds: 120,
      targetRpe: null,
      targetRir: null,
      tempo: null,
      notes: 'Pause on the chest.',
    },
    {
      id: 'ti222222-ti22-4222-8222-ti2222222222',
      position: 2,
      exercise: {
        id: exerciseBId,
        name: 'Incline Dumbbell Press',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'DUMBBELL',
        difficultyLevel: 'INTERMEDIATE',
        status: 'ACTIVE',
      },
      sets: 3,
      prescriptionType: 'REPS',
      repsMin: 10,
      repsMax: 12,
      durationSeconds: null,
      restSeconds: 90,
      targetRpe: null,
      targetRir: null,
      tempo: null,
      notes: null,
    },
  ],
};

const checkIn = {
  id: checkInId,
  periodStart: '2026-08-25',
  periodEnd: '2026-08-31',
  status: 'SUBMITTED',
  responses: { sleepQuality: 4, energyLevel: 3, wins: 'Hit sessions.' },
  submittedAt: '2026-09-01T12:00:00.000Z',
  review: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboard) });
  });
  await page.route('**/api/v1/trainers/me/reports/clients**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) });
  });
  await page.route('**/api/v1/trainers/me/clients**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [clientProfile], meta: overview.meta }),
    });
  });
  await page.route(`**/api/v1/trainers/me/clients/${clientId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(clientProfile) });
  });
  await page.route(`**/api/v1/trainers/me/clients/${clientBId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...clientProfile,
        id: clientBId,
        user: {
          ...clientProfile.user,
          id: '22222222-2222-4222-8222-222222222222',
          email: 'bea@example.test',
          firstName: 'Bea',
        },
      }),
    });
  });
  await page.route(`**/api/v1/clients/${clientId}/check-ins**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: checkInId,
            periodStart: checkIn.periodStart,
            periodEnd: checkIn.periodEnd,
            status: 'SUBMITTED',
            submittedAt: checkIn.submittedAt,
            hasReview: false,
            createdAt: checkIn.createdAt,
          },
        ],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      }),
    });
  });
  await page.route(`**/api/v1/clients/${clientId}/check-ins/${checkInId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(checkIn) });
  });
  await page.route(`**/api/v1/clients/${clientId}/check-ins/${checkInId}/review`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...checkIn,
          status: 'REVIEWED',
          review: {
            id: 'r1111111-r111-4111-8111-r11111111111',
            feedback: 'Keep volume.',
            actionItems: null,
            reviewedByUserId: trainerUser.id,
            createdAt: '2026-09-05T12:00:00.000Z',
            updatedAt: '2026-09-05T12:00:00.000Z',
          },
        }),
      });
      return;
    }
    await route.fallback();
  });
  await page.route(`**/api/v1/clients/${clientId}/training-plans**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientId}/nutrition-plans**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientId}/progress/summary**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        completedSessions: 0,
        performedSets: 0,
        exercisesPerformed: 0,
        totalReps: 0,
        externalLoadVolumeKg: 0,
        totalDurationSeconds: 0,
        firstCompletedSessionAt: null,
        lastCompletedSessionAt: null,
      }),
    });
  });
  await page.route(`**/api/v1/clients/${clientId}/progress/exercises**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientId}/body-measurements**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientId}/progress-photos**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientId}/workout-sessions**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route('**/api/v1/workout-templates**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isList = /\/api\/v1\/workout-templates\/?$/.test(pathname);
    if (route.request().method() === 'GET' && isList) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: templateId,
              name: 'Push Strength',
              description: 'Upper body pressing',
              status: 'ACTIVE',
              createdByUserId: trainerUser.id,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-04T00:00:00.000Z',
            },
            {
              id: 't2222222-t222-4222-8222-t22222222222',
              name: 'Lower Body',
              description: null,
              status: 'ACTIVE',
              createdByUserId: trainerUser.id,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-02T00:00:00.000Z',
            },
            {
              id: 't3333333-t333-4333-8333-t33333333333',
              name: 'Conditioning',
              description: 'Aerobic intervals',
              status: 'ACTIVE',
              createdByUserId: trainerUser.id,
              createdAt: '2026-08-20T00:00:00.000Z',
              updatedAt: '2026-08-28T00:00:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, totalItems: 3, totalPages: 1 },
        }),
      });
      return;
    }
    if (route.request().method() === 'PUT' && pathname.endsWith('/exercises')) {
      const body = route.request().postDataJSON() as { items?: Array<{ exerciseId: string }> };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...e2eTemplate,
          items: (body.items ?? []).map((item, index) => ({
            ...e2eTemplate.items[index],
            id: `replaced-${index + 1}`,
            position: index + 1,
            exercise: {
              ...(e2eTemplate.items[index]?.exercise ?? e2eTemplate.items[0].exercise),
              id: item.exerciseId,
            },
          })),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(e2eTemplate),
    });
  });
  const exercisesById: Record<string, typeof ownedExercise> = {
    [exerciseId]: ownedExercise,
    [exerciseBId]: ownedExerciseB,
    [adminExerciseId]: adminCatalogExercise,
  };
  const mediaByExercise: Record<
    string,
    Array<{
      id: string;
      mediaType: string;
      originalFileName: string;
      mimeType: string;
      fileSizeBytes: number | null;
      status: string;
      displayOrder: number;
      createdAt: string;
      finalizedAt: string | null;
    }>
  > = {
    [exerciseId]: [{ ...readyImageMedia }],
    [exerciseBId]: [],
    [adminExerciseId]: [{ ...readyImageMedia, originalFileName: 'vital-bench.jpg' }],
  };

  await page.route(signedStorageUrl, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route('**/api/v1/exercises**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const segments = pathname.split('/').filter(Boolean);
    const exercisePathId = segments[3];
    const mediaPathId = segments[5];

    if (pathname.endsWith('/access')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://signed.example.test/exercise-media',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      });
      return;
    }
    if (method === 'POST' && pathname.endsWith('/upload-requests')) {
      const exercise = exercisesById[exercisePathId];
      if (!exercise || exercise.createdByUserId !== trainerUser.id) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 404, code: 'NOT_FOUND', message: 'Exercise not found' }),
        });
        return;
      }
      const payload = route.request().postDataJSON() as {
        mediaType?: string;
        fileName?: string;
        mimeType?: string;
      };
      const media = {
        id: uploadedMediaId,
        mediaType: payload.mediaType === 'IMAGE' ? 'IMAGE' : 'VIDEO',
        originalFileName: payload.fileName ?? 'demo.mp4',
        mimeType: payload.mimeType ?? 'video/mp4',
        fileSizeBytes: null as number | null,
        status: 'PENDING_UPLOAD',
        displayOrder: 0,
        createdAt: '2026-09-07T00:00:00.000Z',
        finalizedAt: null as string | null,
      };
      mediaByExercise[exercisePathId] = [...(mediaByExercise[exercisePathId] ?? []), media];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          media,
          upload: {
            method: 'POST',
            url: signedStorageUrl,
            fields: { key: `exercises/${exercisePathId}/${media.id}/file`, Policy: 'signed' },
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
        }),
      });
      return;
    }
    if (method === 'POST' && pathname.endsWith('/finalize')) {
      const list = mediaByExercise[exercisePathId] ?? [];
      mediaByExercise[exercisePathId] = list.map((item) =>
        item.id === mediaPathId
          ? { ...item, status: 'READY', fileSizeBytes: 1024, finalizedAt: '2026-09-07T00:01:00.000Z' }
          : item,
      );
      const media = (mediaByExercise[exercisePathId] ?? []).find((item) => item.id === mediaPathId) ?? list[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(media),
      });
      return;
    }
    if (method === 'DELETE' && mediaPathId) {
      mediaByExercise[exercisePathId] = (mediaByExercise[exercisePathId] ?? []).filter(
        (item) => item.id !== mediaPathId,
      );
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (/\/exercises\/[^/]+\/media\/?$/.test(pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mediaByExercise[exercisePathId] ?? []),
      });
      return;
    }
    if (method === 'GET' && /\/api\/v1\/exercises\/?$/.test(pathname)) {
      const search = new URL(route.request().url()).searchParams.get('search')?.toLowerCase() ?? '';
      const rows = [ownedExercise, ownedExerciseB].filter(
        (row) => !search || row.name.toLowerCase().includes(search),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: rows,
          meta: { page: 1, limit: 20, totalItems: rows.length, totalPages: 1 },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(exercisesById[exercisePathId] ?? ownedExercise),
    });
  });
  await page.route('**/api/v1/nutrition/foods**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
  await page.route(`**/api/v1/clients/${clientBId}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/progress/summary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          completedSessions: 0,
          performedSets: 0,
          exercisesPerformed: 0,
          totalReps: 0,
          externalLoadVolumeKg: 0,
          totalDurationSeconds: 0,
          firstCompletedSessionAt: null,
          lastCompletedSessionAt: null,
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPage) });
  });
}

const trainerEmail = process.env.E2E_TRAINER_EMAIL;
const trainerPassword = process.env.E2E_TRAINER_PASSWORD;

test.describe('trainer workspace', () => {
  test('trainer moves from dashboard through client workspace and reviews a check-in', async ({ page }) => {
    test.setTimeout(60_000);
    await mockAuthenticatedTrainer(page);
    await page.goto('/trainer/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Ada Client')).toBeVisible();

    await page.getByRole('link', { name: 'Clients' }).first().click();
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await page.getByRole('link', { name: 'Open Ada Client' }).first().click();
    await expect(page.getByRole('heading', { name: 'Ada Client' })).toBeVisible();

    const workspaceNav = page.getByRole('navigation', { name: 'Working with' });
    await workspaceNav.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByText('No completed training in this window.')).toBeVisible();

    await workspaceNav.getByRole('link', { name: 'Training', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible();

    await workspaceNav.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await expect(page.getByText('Prescribed meal plans')).toBeVisible();

    await workspaceNav.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Write review' })).toBeVisible();
    await page.getByRole('link', { name: 'Write review' }).click();
    await page.getByLabel('Feedback').fill('Keep the current volume.');
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(page.getByText('Reviewed').first()).toBeVisible();
  });

  test('switching clients does not keep the previous client heading', async ({ page }) => {
    test.setTimeout(60_000);
    await mockAuthenticatedTrainer(page);
    await page.goto(`/trainer/clients/${clientId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Ada Client' })).toBeVisible({ timeout: 20_000 });
    const workspaceNav = page.getByRole('navigation', { name: 'Working with' });
    await workspaceNav.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByText('No completed training in this window.')).toBeVisible();
    await workspaceNav.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await expect(page.getByText('Prescribed meal plans')).toBeVisible();
    await workspaceNav.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Write review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ada Client' })).toBeVisible();

    await page.getByRole('link', { name: 'All Clients' }).click();
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await page.getByRole('link', { name: 'Open Bea Client' }).first().click();
    await expect(page.getByRole('heading', { name: 'Bea Client' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ada Client' })).toHaveCount(0);
    const beaNav = page.getByRole('navigation', { name: 'Working with' });
    await beaNav.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bea Client' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ada Client' })).toHaveCount(0);
    await expect(page.getByText('No completed training in this window.')).toBeVisible();
  });

  test('trainer shell stays usable at a compact viewport', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAuthenticatedTrainer(page);
    await page.goto('/trainer/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('link', { name: 'Clients' }).click();
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  const viewports = [320, 375, 430, 768, 1024, 1280, 1440] as const;

  for (const width of viewports) {
    test(`trainer dashboard and clients do not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 900 });
      await mockAuthenticatedTrainer(page);
      await page.goto('/trainer/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
      const dashboardOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(dashboardOverflow).toBeLessThanOrEqual(1);

      await page.goto('/trainer/clients', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 20_000 });
      const clientsOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(clientsOverflow).toBeLessThanOrEqual(1);

      await page.goto(`/trainer/clients/${clientId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Ada Client' })).toBeVisible({ timeout: 20_000 });
      const clientOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(clientOverflow).toBeLessThanOrEqual(1);

      await page.goto('/trainer/training', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible({ timeout: 20_000 });
      const trainingOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(trainingOverflow).toBeLessThanOrEqual(1);

      await page.goto(`/trainer/training/${templateId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Push Strength' })).toBeVisible({ timeout: 20_000 });
      const builderOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(builderOverflow).toBeLessThanOrEqual(1);
    });
  }

  test('trainer workout builder shows prescriptions and opens add exercise', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedTrainer(page);
    await page.goto(`/trainer/training/${templateId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Push Strength' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('2 exercises')).toBeVisible();
    await expect(page.getByText(/4 sets · 8–10 reps · 120s rest/)).toBeVisible();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add exercise' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Search exercises')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Bench Press/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Add exercise/ }).first()).toBeVisible();
    await dialog.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('trainer exercise library shows cards, opens detail, and keeps create in a sheet', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedTrainer(page);
    await page.goto('/trainer/exercises', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Exercise library')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Incline Dumbbell Press' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Search exercises…' }).fill('bench');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Incline Dumbbell Press' })).toHaveCount(0);
    await page.getByRole('button', { name: 'New exercise' }).click();
    const create = page.getByRole('dialog', { name: 'New exercise' });
    await expect(create).toBeVisible();
    await create.press('Escape');
    await expect(create).toHaveCount(0);
    await page.getByRole('link', { name: 'Open' }).first().click();
    await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Primary muscle')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Bench Press demonstration' })).toBeVisible();
  });

  test('owning trainer uploads demonstration media through signed POST then finalize', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedTrainer(page);
    await page.goto(`/trainer/exercises/${exerciseId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Upload media' })).toBeVisible();
    await page.getByLabel('File').setInputFiles({
      name: 'squat.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-bytes'),
    });
    await page.getByRole('button', { name: 'Upload media' }).click();
    await expect(page.getByText('squat.mp4')).toBeVisible();
    await expect(page.getByText('Ready').first()).toBeVisible();
    const persisted = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(persisted).not.toContain('storage.test');
    expect(persisted).not.toContain('signed.example.test');
  });

  test('hides upload on Admin-owned catalog exercises', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedTrainer(page);
    await page.goto(`/trainer/exercises/${adminExerciseId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Vital bench press' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Catalog demonstrations are read-only')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload media' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByLabel('File')).toHaveCount(0);
  });

  test('trainer training library opens create in a sheet', async ({ page }) => {
    test.setTimeout(45_000);
    await mockAuthenticatedTrainer(page);
    await page.goto('/trainer/training', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: /Open template/ })).toHaveCount(3);
    await page.getByRole('button', { name: 'New template' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create workout template' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Template name')).toBeVisible();
    await dialog.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('real backend trainer smoke', async ({ page }) => {
    test.skip(
      !trainerEmail || !trainerPassword,
      'Set E2E_TRAINER_EMAIL and E2E_TRAINER_PASSWORD for a read-only TRAINER round-trip. Do not commit credentials.',
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email' }).fill(trainerEmail);
    await page.getByLabel('Password', { exact: true }).fill(trainerPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/trainer/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

test('nutrition editor saves portions before activation and fits supported widths', async ({ page }) => {
  test.setTimeout(90_000);
  await mockAuthenticatedTrainer(page);
  const planId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const foodId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  let savedQuantity = 100;
  let savedName = 'Breakfast';
  let status = 'DRAFT';
  const response = () => ({
    id: planId, name: 'Nutrition coaching plan', status, clientProfileId: clientId, createdByUserId: trainerUser.id,
    createdAt: '2026-09-24T00:00:00Z', updatedAt: '2026-09-24T00:00:00Z',
    targets: { caloriesKcal: 2000, proteinG: 150, carbohydratesG: 220, fatG: 65 },
    mealPlanTotals: { caloriesKcal: 165, proteinG: 31, carbohydratesG: 0, fatG: 3.6, fiberG: 0 },
    targetDifferences: { caloriesDifferenceKcal: -1835, proteinDifferenceG: -119, carbohydratesDifferenceG: -220, fatDifferenceG: -61.4 },
    meals: [{ id: 'meal-one', name: savedName, mealType: 'BREAKFAST', position: 0,
      totals: { caloriesKcal: 165, proteinG: 31, carbohydratesG: 0, fatG: 3.6, fiberG: 0 },
      items: [{ id: 'item-one', foodId, foodName: 'Chicken breast snapshot', quantityGrams: savedQuantity, position: 0,
        nutrition: { caloriesKcal: 165, proteinG: 31, carbohydratesG: 0, fatG: 3.6, fiberG: 0 } }],
    }],
  });
  await page.route(`**/api/v1/clients/${clientId}/nutrition-plans/${planId}**`, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      savedQuantity = body.meals[0].items[0].quantityGrams;
      savedName = body.meals[0].name;
    }
    if (route.request().method() === 'PATCH') status = 'ACTIVE';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response()) });
  });
  await page.goto(`/trainer/clients/${clientId}/nutrition/${planId}`);
  await expect(page.getByRole('heading', { name: 'Nutrition coaching plan' })).toBeVisible();
  await expect(page.getByText('Chicken breast snapshot')).toBeVisible();
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  const name = page.getByLabel('Meal name', { exact: true });
  await name.fill('Breakfast after training');
  await expect(name).toBeFocused();
  await page.getByLabel('Quantity (g)', { exact: true }).fill('125.25');
  await expect(page.getByRole('button', { name: 'Activate', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Save meals', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activate', exact: true })).toBeEnabled();
  expect(savedQuantity).toBe(125.25);
  expect(savedName).toBe('Breakfast after training');
  await page.screenshot({ path: 'node_modules/nutrition-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
  await expect(page.getByText('Chicken breast snapshot')).toBeVisible();
});
