import { expect, test, type Page } from '@playwright/test';

const adminUser = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'admin.a@example.test',
  firstName: 'Avery',
  lastName: 'Admin',
  role: 'ADMIN',
};

const trainerId = '33333333-3333-4333-8333-333333333333';
const createdTrainerId = '55555555-5555-4555-8555-555555555555';
const clientId = '11111111-1111-4111-8111-111111111111';
const exerciseId = '77777777-7777-4777-8777-777777777777';
const foodId = '88888888-8888-4888-8888-888888888888';
const mediaId = '99999999-9999-4999-8999-999999999999';
const signedUploadUrl = 'https://storage.example.test/admin-exercise-upload';

type TrainerRow = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'TRAINER';
    status: 'ACTIVE' | 'DISABLED';
  };
  phone: string | null;
  professionalTitle: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

type ClientRow = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT';
    status: 'ACTIVE' | 'DISABLED';
  };
  phone: string | null;
  dateOfBirth: string | null;
  primaryGoal: 'FAT_LOSS' | 'MUSCLE_GAIN' | 'STRENGTH' | 'GENERAL_FITNESS' | 'MAINTENANCE' | 'OTHER';
  goalNotes: string | null;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  createdAt: string;
  updatedAt: string;
};

type ExerciseRow = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  primaryMuscleGroup: 'CHEST' | 'BACK' | 'OTHER';
  equipmentType: 'BARBELL' | 'DUMBBELL' | 'OTHER';
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'ACTIVE' | 'ARCHIVED';
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type FoodRow = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  nutritionPer100g: {
    caloriesKcal: number;
    proteinG: number;
    carbohydratesG: number;
    fatG: number;
    fiberG: number | null;
  };
  status: 'ACTIVE' | 'ARCHIVED';
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

const trainer: TrainerRow = {
  id: trainerId,
  user: {
    id: 'aaaa3333-3333-4333-8333-333333333333',
    email: 'tess@example.test',
    firstName: 'Tess',
    lastName: 'Trainer',
    role: 'TRAINER',
    status: 'ACTIVE',
  },
  phone: '+506 2222-0000',
  professionalTitle: 'Strength coach',
  bio: 'Platform trainer',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const client: ClientRow = {
  id: clientId,
  user: {
    id: 'bbbb1111-1111-4111-8111-111111111111',
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

const exercise: ExerciseRow = {
  id: exerciseId,
  name: 'Vital bench press',
  description: 'Admin catalog lift',
  instructions: 'Press with control.',
  primaryMuscleGroup: 'CHEST',
  equipmentType: 'BARBELL',
  difficultyLevel: 'INTERMEDIATE',
  status: 'ACTIVE',
  createdByUserId: adminUser.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const food: FoodRow = {
  id: foodId,
  name: 'Greek yogurt',
  brand: 'Vital',
  description: 'High protein dairy',
  nutritionPer100g: {
    caloriesKcal: 82,
    proteinG: 10,
    carbohydratesG: 3.6,
    fatG: 2,
    fiberG: null,
  },
  status: 'ACTIVE',
  createdByUserId: adminUser.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function pageBody<T>(rows: T[]) {
  return {
    data: rows,
    meta: { page: 1, limit: 10, totalItems: rows.length, totalPages: rows.length ? 1 : 0 },
  };
}

function jsonError(status: number, code: string, message: string) {
  return {
    statusCode: status,
    code,
    message,
    path: '/api/v1/admin',
    timestamp: '2026-09-09T00:00:00.000Z',
    requestId: `req-${code.toLowerCase()}`,
  };
}

async function fulfillJson(route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockAuthenticatedAdmin(page: Page) {
  let trainers: TrainerRow[] = [{ ...trainer, user: { ...trainer.user } }];
  let clients: ClientRow[] = [{ ...client, user: { ...client.user } }];
  let exercises: ExerciseRow[] = [{ ...exercise }];
  let foods: FoodRow[] = [{ ...food, nutritionPer100g: { ...food.nutritionPer100g } }];
  let currentAssignment: { id: string; trainer: TrainerRow; assignedAt: string } | null = null;
  let history: Array<{
    id: string;
    trainer: TrainerRow;
    assignedAt: string;
    endedAt: string | null;
    assignedByUserId: string;
    endedByUserId: string | null;
  }> = [];
  let assignmentSequence = 0;
  let media = [
    {
      id: mediaId,
      mediaType: 'IMAGE',
      originalFileName: 'bench.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 48000,
      status: 'READY',
      displayOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      finalizedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await fulfillJson(route, {
      accessToken: 'e2e-admin-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: adminUser,
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await fulfillJson(route, adminUser);
  });
  await page.route('**/api/v1/admin/dashboard**', async (route) => {
    await fulfillJson(route, {
      periodDays: Number(new URL(route.request().url()).searchParams.get('periodDays') ?? 7),
      activeTrainers: trainers.filter((row) => row.user.status === 'ACTIVE').length,
      activeClients: clients.filter((row) => row.user.status === 'ACTIVE').length,
      currentlyAssignedClients: currentAssignment ? 1 : 0,
      unassignedActiveClients: currentAssignment ? 0 : clients.length,
      activeTrainingPlans: 1,
      activeNutritionPlans: 1,
      completedWorkoutSessions: 4,
      pendingCheckIns: 2,
      notifications: { unreadCount: 0 },
    });
  });
  await page.route(signedUploadUrl, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route('**/api/v1/trainers**', async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const id = segments[3];

    if (method === 'POST' && segments.length === 3) {
      const body = route.request().postDataJSON() as {
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
        professionalTitle?: string;
        bio?: string;
      };
      const created: TrainerRow = {
        id: createdTrainerId,
        user: {
          id: 'cccc5555-5555-4555-8555-555555555555',
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          role: 'TRAINER',
          status: 'ACTIVE',
        },
        phone: body.phone ?? null,
        professionalTitle: body.professionalTitle ?? null,
        bio: body.bio ?? null,
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      };
      trainers = [created, ...trainers];
      await fulfillJson(route, created, 201);
      return;
    }
    if (method === 'PATCH' && segments[4] === 'status') {
      const body = route.request().postDataJSON() as { status: 'ACTIVE' | 'DISABLED' };
      trainers = trainers.map((row) => row.id === id ? { ...row, user: { ...row.user, status: body.status } } : row);
      await fulfillJson(route, trainers.find((row) => row.id === id) ?? trainer);
      return;
    }
    if (method === 'PATCH' && id) {
      const body = route.request().postDataJSON() as Partial<TrainerRow> & Partial<TrainerRow['user']>;
      trainers = trainers.map((row) =>
        row.id === id
          ? {
              ...row,
              phone: String(body.phone ?? row.phone),
              professionalTitle: String(body.professionalTitle ?? row.professionalTitle),
              bio: String(body.bio ?? row.bio),
              user: {
                ...row.user,
                email: String(body.email ?? row.user.email),
                firstName: String(body.firstName ?? row.user.firstName),
                lastName: String(body.lastName ?? row.user.lastName),
              },
            }
          : row,
      );
      await fulfillJson(route, trainers.find((row) => row.id === id) ?? trainer);
      return;
    }
    if (method === 'GET' && id) {
      const found = trainers.find((row) => row.id === id);
      await fulfillJson(route, found ?? jsonError(404, 'NOT_FOUND', 'Trainer not found'), found ? 200 : 404);
      return;
    }
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const term = url.searchParams.get('search')?.toLowerCase() ?? '';
      const status = url.searchParams.get('status');
      await fulfillJson(
        route,
        pageBody(
          trainers.filter((row) => {
            const searchable = `${row.user.firstName} ${row.user.lastName} ${row.user.email}`.toLowerCase();
            return (!term || searchable.includes(term)) && (!status || row.user.status === status);
          }),
        ),
      );
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/v1/clients**', async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const id = segments[3];

    if (method === 'GET' && segments[4] === 'trainer') {
      await fulfillJson(route, { trainer: currentAssignment?.trainer ?? null });
      return;
    }
    if (method === 'PUT' && segments[4] === 'trainer') {
      const body = route.request().postDataJSON() as { trainerId: string };
      const selected = trainers.find((row) => row.id === body.trainerId) ?? trainers[0]!;
      const endedAt = '2026-09-09T00:00:00.000Z';
      history = history.map((row) => (row.endedAt ? row : { ...row, endedAt, endedByUserId: adminUser.id }));
      assignmentSequence += 1;
      currentAssignment = {
        id: `abababab-abab-4aba-8aba-${String(assignmentSequence).padStart(12, '0')}`,
        trainer: selected,
        assignedAt: '2026-09-09T00:00:00.000Z',
      };
      history = [{ ...currentAssignment, assignedByUserId: adminUser.id, endedAt: null, endedByUserId: null }, ...history];
      await fulfillJson(route, currentAssignment);
      return;
    }
    if (method === 'DELETE' && segments[4] === 'trainer') {
      history = history.map((row) =>
        row.endedAt ? row : { ...row, endedAt: '2026-09-09T01:00:00.000Z', endedByUserId: adminUser.id },
      );
      currentAssignment = null;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (method === 'GET' && segments[4] === 'trainer-history') {
      await fulfillJson(route, {
        data: history,
        meta: { page: 1, limit: 10, totalItems: history.length, totalPages: history.length ? 1 : 0 },
      });
      return;
    }
    if (method === 'POST' && segments.length === 3) {
      const body = route.request().postDataJSON() as {
        email: string;
        firstName: string;
        lastName: string;
        primaryGoal: ClientRow['primaryGoal'];
        experienceLevel: ClientRow['experienceLevel'];
        phone?: string;
        dateOfBirth?: string;
        goalNotes?: string;
      };
      const created: ClientRow = {
        id: '66666666-6666-4666-8666-666666666666',
        user: {
          id: 'dddd6666-6666-4666-8666-666666666666',
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          role: 'CLIENT',
          status: 'ACTIVE',
        },
        phone: body.phone ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        primaryGoal: body.primaryGoal,
        goalNotes: body.goalNotes ?? null,
        experienceLevel: body.experienceLevel,
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      };
      clients = [created, ...clients];
      await fulfillJson(route, created, 201);
      return;
    }
    if (method === 'PATCH' && segments[4] === 'status') {
      const body = route.request().postDataJSON() as { status: 'ACTIVE' | 'DISABLED' };
      clients = clients.map((row) => row.id === id ? { ...row, user: { ...row.user, status: body.status } } : row);
      await fulfillJson(route, clients.find((row) => row.id === id) ?? client);
      return;
    }
    if (method === 'PATCH' && id) {
      const body = route.request().postDataJSON() as Partial<ClientRow> & Partial<ClientRow['user']>;
      clients = clients.map((row) =>
        row.id === id
          ? {
              ...row,
              phone: String(body.phone ?? row.phone),
              dateOfBirth: String(body.dateOfBirth ?? row.dateOfBirth),
              goalNotes: String(body.goalNotes ?? row.goalNotes),
              primaryGoal: (body.primaryGoal ?? row.primaryGoal) as ClientRow['primaryGoal'],
              experienceLevel: (body.experienceLevel ?? row.experienceLevel) as ClientRow['experienceLevel'],
              user: {
                ...row.user,
                email: String(body.email ?? row.user.email),
                firstName: String(body.firstName ?? row.user.firstName),
                lastName: String(body.lastName ?? row.user.lastName),
              },
            }
          : row,
      );
      await fulfillJson(route, clients.find((row) => row.id === id) ?? client);
      return;
    }
    if (method === 'GET' && id) {
      const found = clients.find((row) => row.id === id);
      await fulfillJson(route, found ?? jsonError(404, 'NOT_FOUND', 'Client not found'), found ? 200 : 404);
      return;
    }
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const term = url.searchParams.get('search')?.toLowerCase() ?? '';
      const primaryGoal = url.searchParams.get('primaryGoal');
      await fulfillJson(
        route,
        pageBody(
          clients.filter((row) => {
            const searchable = `${row.user.firstName} ${row.user.lastName} ${row.user.email}`.toLowerCase();
            return (!term || searchable.includes(term)) && (!primaryGoal || row.primaryGoal === primaryGoal);
          }),
        ),
      );
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/v1/exercises**', async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const id = segments[3];
    const mediaPathId = segments[5];

    if (method === 'GET' && pathname.endsWith('/access')) {
      await fulfillJson(route, {
        url: 'https://signed.example.test/admin-media',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      return;
    }
    if (method === 'POST' && pathname.endsWith('/upload-requests')) {
      const body = route.request().postDataJSON() as { mediaType?: string; fileName?: string; mimeType?: string; fileSizeBytes?: number };
      const created = {
        id: 'aaaa9999-9999-4999-8999-999999999999',
        mediaType: body.mediaType ?? 'IMAGE',
        originalFileName: body.fileName ?? 'demo.jpg',
        mimeType: body.mimeType ?? 'image/jpeg',
        fileSizeBytes: body.fileSizeBytes ?? null,
        status: 'PENDING_UPLOAD',
        displayOrder: 0,
        createdAt: '2026-09-09T00:00:00.000Z',
        finalizedAt: null,
      };
      media = [...media, created];
      await fulfillJson(route, {
        media: created,
        upload: {
          method: 'POST',
          url: signedUploadUrl,
          fields: { key: `exercises/${id}/${created.id}/file`, Policy: 'signed' },
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      }, 201);
      return;
    }
    if (method === 'POST' && pathname.endsWith('/finalize')) {
      media = media.map((row) => row.id === mediaPathId ? { ...row, status: 'READY', finalizedAt: '2026-09-09T00:01:00.000Z' } : row);
      await fulfillJson(route, media.find((row) => row.id === mediaPathId) ?? media[0]);
      return;
    }
    if (method === 'DELETE' && mediaPathId) {
      media = media.filter((row) => row.id !== mediaPathId);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (method === 'GET' && pathname.endsWith('/media')) {
      await fulfillJson(route, media);
      return;
    }
    if (method === 'POST' && segments.length === 3) {
      const body = route.request().postDataJSON() as Partial<ExerciseRow>;
      const created: ExerciseRow = {
        ...exercise,
        id: 'eeee7777-7777-4777-8777-777777777777',
        name: String(body.name ?? 'New exercise'),
        description: String(body.description ?? ''),
        instructions: String(body.instructions ?? ''),
        primaryMuscleGroup: (body.primaryMuscleGroup ?? 'OTHER') as ExerciseRow['primaryMuscleGroup'],
        equipmentType: (body.equipmentType ?? 'OTHER') as ExerciseRow['equipmentType'],
        difficultyLevel: (body.difficultyLevel ?? 'BEGINNER') as ExerciseRow['difficultyLevel'],
      };
      exercises = [created, ...exercises];
      await fulfillJson(route, created, 201);
      return;
    }
    if (method === 'PATCH' && segments[4] === 'status') {
      const body = route.request().postDataJSON() as { status: 'ACTIVE' | 'ARCHIVED' };
      exercises = exercises.map((row) => row.id === id ? { ...row, status: body.status } : row);
      await fulfillJson(route, exercises.find((row) => row.id === id) ?? exercise);
      return;
    }
    if (method === 'GET' && id) {
      const found = exercises.find((row) => row.id === id);
      await fulfillJson(route, found ?? jsonError(404, 'NOT_FOUND', 'Exercise not found'), found ? 200 : 404);
      return;
    }
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const term = url.searchParams.get('search')?.toLowerCase() ?? '';
      const status = url.searchParams.get('status') ?? 'ACTIVE';
      await fulfillJson(
        route,
        pageBody(exercises.filter((row) => (!term || row.name.toLowerCase().includes(term)) && row.status === status)),
      );
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/v1/nutrition/foods**', async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const id = segments[4];

    if (method === 'POST' && segments.length === 4) {
      const body = route.request().postDataJSON() as {
        name: string;
        brand?: string;
        description?: string;
        caloriesPer100g: number;
        proteinGPer100g: number;
        carbohydratesGPer100g: number;
        fatGPer100g: number;
        fiberGPer100g?: number | null;
      };
      const created: FoodRow = {
        id: 'ffff8888-8888-4888-8888-888888888888',
        name: body.name,
        brand: body.brand ?? null,
        description: body.description ?? null,
        nutritionPer100g: {
          caloriesKcal: body.caloriesPer100g,
          proteinG: body.proteinGPer100g,
          carbohydratesG: body.carbohydratesGPer100g,
          fatG: body.fatGPer100g,
          fiberG: body.fiberGPer100g ?? null,
        },
        status: 'ACTIVE',
        createdByUserId: adminUser.id,
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      };
      foods = [created, ...foods];
      await fulfillJson(route, created, 201);
      return;
    }
    if (method === 'PATCH' && segments[5] === 'status') {
      const body = route.request().postDataJSON() as { status: 'ACTIVE' | 'ARCHIVED' };
      foods = foods.map((row) => row.id === id ? { ...row, status: body.status } : row);
      await fulfillJson(route, foods.find((row) => row.id === id) ?? food);
      return;
    }
    if (method === 'GET' && id) {
      const found = foods.find((row) => row.id === id);
      await fulfillJson(route, found ?? jsonError(404, 'NOT_FOUND', 'Food not found'), found ? 200 : 404);
      return;
    }
    if (method === 'GET') {
      const term = new URL(route.request().url()).searchParams.get('search')?.toLowerCase() ?? '';
      await fulfillJson(route, pageBody(foods.filter((row) => !term || row.name.toLowerCase().includes(term))));
      return;
    }
    await route.fallback();
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('admin workspace', () => {
  test('admin manages platform accounts, assignments, exercises, and foods', async ({ page }) => {
    test.setTimeout(90_000);
    page.on('dialog', (dialog) => void dialog.accept());
    await mockAuthenticatedAdmin(page);
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Trainer coverage' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Review assignments' })).toBeVisible();
    await page.getByLabel('Reporting window').selectOption('30');
    await expect(page).toHaveURL(/periodDays=30/);
    await expect(page.getByText('Completed sessions, last 30 days')).toBeVisible();

    await page.getByRole('link', { name: 'Trainers' }).first().click();
    await expect(page.getByRole('heading', { name: 'Trainers', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New trainer' }).click();
    const trainerDialog = page.getByRole('dialog', { name: 'New trainer' });
    await trainerDialog.getByLabel('Email').fill('neo.trainer@example.test');
    await trainerDialog.getByLabel('Temporary password').fill('temporary-pass');
    await trainerDialog.getByLabel('First name').fill('Neo');
    await trainerDialog.getByLabel('Last name').fill('Trainer');
    await trainerDialog.getByLabel('Professional title').fill('Mobility coach');
    await trainerDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('link', { name: 'Neo Trainer' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search trainers' }).or(page.getByRole('textbox', { name: 'Search trainers' })).fill('tess');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('link', { name: 'Tess Trainer' }).click();
    await expect(page.getByRole('heading', { name: 'Tess Trainer', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    const editTrainer = page.getByRole('dialog', { name: 'Edit trainer' });
    await editTrainer.getByLabel('Professional title').fill('Performance lead');
    await editTrainer.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Performance lead')).toBeVisible();
    await page.getByRole('button', { name: 'Disable' }).click();
    await page.getByRole('dialog', { name: 'Disable trainer?' }).getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Disabled').first()).toBeVisible();

    await page.getByRole('link', { name: 'Clients' }).first().click();
    await expect(page.getByRole('heading', { name: 'Clients', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New client' }).click();
    const clientDialog = page.getByRole('dialog', { name: 'New client' });
    await clientDialog.getByLabel('Email').fill('beatrice@example.test');
    await clientDialog.getByLabel('Temporary password').fill('temporary-pass');
    await clientDialog.getByLabel('First name').fill('Beatrice');
    await clientDialog.getByLabel('Last name').fill('Client');
    await clientDialog.getByLabel('Primary goal').selectOption('FAT_LOSS');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('link', { name: 'Beatrice Client' })).toBeVisible();
    await page.getByRole('link', { name: 'Ada Client' }).click();
    await expect(page.getByRole('heading', { name: 'Ada Client', level: 1 })).toBeVisible();
    const assignmentCard = page.getByRole('region', { name: 'Trainer assignment' });
    await expect(assignmentCard.getByText('Unassigned')).toBeVisible();
    await assignmentCard.getByRole('button', { name: 'Assign trainer' }).click();
    const assignDialog = page.getByRole('dialog', { name: 'Assign trainer' });
    await expect(assignDialog.getByRole('radio', { name: /Tess Trainer/ })).toHaveCount(0);
    await assignDialog.getByRole('radio', { name: /Neo Trainer/ }).check();
    await assignDialog.getByRole('button', { name: 'Assign trainer' }).click();
    await expect(assignmentCard.getByRole('link', { name: 'Neo Trainer' })).toBeVisible();
    await assignmentCard.getByRole('button', { name: 'End assignment' }).click();
    await page.getByRole('dialog', { name: 'End trainer assignment?' }).getByRole('button', { name: 'End assignment' }).click();
    await expect(assignmentCard.getByText('Unassigned')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Assignment history' }).getByText('Historical')).toBeVisible();

    await page.getByRole('link', { name: 'Assignments' }).first().click();
    await expect(page.getByRole('heading', { name: 'Assignments', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Assign: Ada Client' }).click();
    const rowAssign = page.getByRole('dialog', { name: 'Assign trainer' });
    await rowAssign.getByRole('radio', { name: /Neo Trainer/ }).check();
    await rowAssign.getByRole('button', { name: 'Assign trainer' }).click();
    const adaRow = page.getByRole('row', { name: /Ada Client/ });
    await expect(adaRow.getByRole('link', { name: 'Neo Trainer' })).toBeVisible();
    await expect(adaRow.getByRole('button', { name: 'Change: Ada Client' })).toBeVisible();

    await page.getByRole('link', { name: 'Exercises' }).first().click();
    await expect(page.getByRole('heading', { name: 'Exercises', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New exercise' }).click();
    const exerciseDialog = page.getByRole('dialog', { name: 'New exercise' });
    await exerciseDialog.getByLabel('Name', { exact: true }).fill('Admin row');
    await exerciseDialog.getByLabel('Primary muscle').selectOption('BACK');
    await exerciseDialog.getByLabel('Equipment').selectOption('DUMBBELL');
    await exerciseDialog.getByLabel('Difficulty').selectOption('ADVANCED');
    await exerciseDialog.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('link', { name: 'Admin row' }).click();
    await expect(page.getByRole('heading', { name: 'Admin row', level: 1 })).toBeVisible();
    await expect(page.getByText('Created by you')).toBeVisible();
    await expect(page.locator('img[src*="signed.example.test"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open bench.jpg' }).click();
    await expect(page.locator('img[alt="bench.jpg"]')).toBeVisible();
    const persisted = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(persisted).not.toContain('signed.example.test');
    await page.getByRole('button', { name: 'Close preview' }).click();
    await expect(page.locator('img[alt="bench.jpg"]')).toHaveCount(0);
    await page.getByLabel('File', { exact: true }).setInputFiles({
      name: 'admin-demo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    });
    await expect(page.getByText('admin-demo.jpg')).toBeVisible();
    await page.getByRole('button', { name: 'Upload media' }).click();
    await expect(page.getByRole('button', { name: 'Open admin-demo.jpg' })).toBeVisible();
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('dialog', { name: 'Archive exercise?' }).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Archived').first()).toBeVisible();
    await expect(page.getByText('Reactivate the exercise to upload new media.')).toBeVisible();

    await page.getByRole('link', { name: 'Foods' }).first().click();
    await expect(page.getByRole('heading', { name: 'Foods', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New food' }).click();
    const foodDialog = page.getByRole('dialog', { name: 'New food' });
    await foodDialog.getByLabel('Name', { exact: true }).fill('Quinoa');
    await foodDialog.getByLabel('Brand').fill('Vital');
    await foodDialog.getByLabel('Calories (kcal)').fill('120');
    await foodDialog.getByLabel('Protein (g)').fill('4,4');
    await foodDialog.getByLabel('Carbohydrates (g)').fill('21.3');
    await foodDialog.getByLabel('Fat (g)').fill('1.9');
    await foodDialog.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('link', { name: 'Quinoa' }).click();
    await expect(page.getByRole('heading', { name: 'Quinoa', level: 1 })).toBeVisible();
    await expect(page.getByText('4.4 g')).toBeVisible();
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('dialog', { name: 'Archive food?' }).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Archived').first()).toBeVisible();
  });

  test('admin workspace switches to Spanish without reloading, logging out, or refetching', async ({ page }) => {
    await mockAuthenticatedAdmin(page);
    let trainerListRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'GET' && /\/api\/v1\/trainers(\?|$)/.test(request.url())) {
        trainerListRequests += 1;
      }
    });
    await page.goto('/admin/trainers', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Trainers', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Tess Trainer' })).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __adminNoReload: boolean }).__adminNoReload = true;
    });
    const requestsBefore = trainerListRequests;
    await page.getByRole('button', { name: /Language, English/ }).click();
    await page.getByRole('menuitemradio', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: 'Entrenadores', level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('button', { name: 'Nuevo entrenador' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tess Trainer' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __adminNoReload?: boolean }).__adminNoReload)).toBe(true);
    expect(trainerListRequests).toBe(requestsBefore);
    await expect(page).toHaveURL(/\/admin\/trainers/);
  });

  for (const role of [
    { name: 'TRAINER', user: { id: '33333333-aaaa-4333-8333-333333333333', email: 'tess@example.test', firstName: 'Tess', lastName: 'Trainer', role: 'TRAINER' } },
    { name: 'CLIENT', user: { id: '11111111-aaaa-4111-8111-111111111111', email: 'ada@example.test', firstName: 'Ada', lastName: 'Client', role: 'CLIENT' } },
  ] as const) {
    test(`${role.name} is redirected away from Admin routes`, async ({ page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await fulfillJson(route, jsonError(404, 'NOT_FOUND', 'Not mocked'), 404);
      });
      await page.route('**/api/v1/auth/refresh', async (route) => {
        await fulfillJson(route, { accessToken: 'e2e-role-token', tokenType: 'Bearer', expiresIn: 900, user: role.user });
      });
      await page.route('**/api/v1/auth/me', async (route) => {
        await fulfillJson(route, role.user);
      });
      for (const path of ['/admin/dashboard', '/admin/trainers', `/admin/clients/${clientId}`, '/admin/exercises']) {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await expect(page).not.toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Trainers', level: 1 })).toHaveCount(0);
      }
    });
  }

  test('mobile navigation reaches every Admin section from the sheet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await mockAuthenticatedAdmin(page);
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 20_000 });
    for (const [label, heading] of [
      ['Trainers', 'Trainers'],
      ['Clients', 'Clients'],
      ['Assignments', 'Assignments'],
      ['Exercises', 'Exercises'],
      ['Foods', 'Foods'],
    ] as const) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const nav = page.getByRole('dialog');
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
    }
  });

  test('shows platform empty, forbidden, not found, conflict, and network states', async ({ page }) => {
    await mockAuthenticatedAdmin(page);
    await page.route('**/api/v1/nutrition/foods**', async (route) => {
      await fulfillJson(route, pageBody([]));
    });
    await page.goto('/admin/foods', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No foods')).toBeVisible({ timeout: 20_000 });

    await page.route('**/api/v1/trainers**', async (route) => {
      await fulfillJson(route, jsonError(403, 'FORBIDDEN', 'Forbidden'), 403);
    });
    await page.goto('/admin/trainers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Not allowed' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Forbidden', { exact: true })).toHaveCount(0);

    await page.route(`**/api/v1/clients/${clientId}`, async (route) => {
      await fulfillJson(route, jsonError(404, 'NOT_FOUND', 'Client not found'), 404);
    });
    await page.goto(`/admin/clients/${clientId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Client not found')).toHaveCount(0);

    await page.route('**/api/v1/exercises**', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, jsonError(409, 'CONFLICT', 'Exercise name already exists'), 409);
        return;
      }
      await route.fallback();
    });
    await page.goto('/admin/exercises', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New exercise' }).click();
    const dialog = page.getByRole('dialog', { name: 'New exercise' });
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog.getByText('This field is required.').first()).toBeVisible();
    await dialog.getByLabel('Name', { exact: true }).fill('Vital bench press');
    await dialog.getByLabel('Primary muscle').selectOption('CHEST');
    await dialog.getByLabel('Equipment').selectOption('BARBELL');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog.getByText('An exercise with this name already exists.')).toBeVisible();
    await expect(page.getByText('Exercise name already exists', { exact: true })).toHaveCount(0);

    await page.route('**/api/v1/nutrition/foods**', async (route) => {
      await fulfillJson(route, pageBody([]));
    });
    await page.goto('/admin/foods?search=zzz', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'No matches' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('No foods')).toHaveCount(0);

    await page.route('**/api/v1/admin/dashboard**', async (route) => {
      await route.abort('failed');
    });
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 20_000 });
  });

  const viewports = [320, 375, 430, 768, 1024, 1280, 1440] as const;

  for (const width of viewports) {
    test(`admin workspace has no page overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockAuthenticatedAdmin(page);
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 20_000 });
      await assertNoHorizontalOverflow(page);
      for (const [path, heading] of [
        ['/admin/trainers', 'Trainers'],
        [`/admin/trainers/${trainerId}`, 'Tess Trainer'],
        ['/admin/clients', 'Clients'],
        [`/admin/clients/${clientId}`, 'Ada Client'],
        ['/admin/assignments', 'Assignments'],
        ['/admin/exercises', 'Exercises'],
        [`/admin/exercises/${exerciseId}`, 'Vital bench press'],
        ['/admin/foods', 'Foods'],
        [`/admin/foods/${foodId}`, 'Greek yogurt'],
      ] as const) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible({ timeout: 20_000 });
        await assertNoHorizontalOverflow(page);
      }
    });
  }
});
