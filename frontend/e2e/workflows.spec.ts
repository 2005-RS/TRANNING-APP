import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * Cross-role workflows against the real API, using the accounts the CI job
 * seeds (`E2E_*`). Each step builds on the previous one, so the file runs
 * serially and stops at the first failure. Test names keep "real backend" so
 * the CI smoke step selects them.
 */
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const trainer = { email: process.env.E2E_TRAINER_EMAIL, password: process.env.E2E_TRAINER_PASSWORD };
const client = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };

const run = Date.now().toString(36);
const exerciseName = `Flow squat ${run}`;
const templateName = `Flow lower ${run}`;
const planName = `Flow block ${run}`;
const feedback = `Flow feedback ${run}`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inboxItem(page: Page, text: RegExp) {
  return page.getByRole('list', { name: 'Notifications' }).getByRole('listitem').filter({ hasText: text }).first();
}

async function signIn(page: Page, account: { email?: string; password?: string }) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Email' }).fill(account.email ?? '');
  await page.getByLabel('Password', { exact: true }).fill(account.password ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 20_000 });
}

test.describe.serial('real backend workflows', () => {
  test.skip(
    !admin.email || !admin.password || !trainer.email || !trainer.password || !client.email || !client.password,
    'Set E2E_ADMIN_*, E2E_TRAINER_*, and E2E_EMAIL/E2E_PASSWORD for the seeded accounts. Do not commit credentials.',
  );
  test.setTimeout(90_000);

  test('real backend admin creates and disables a trainer and assigns the client', async ({ page }) => {
    await signIn(page, admin);

    await page.goto('/admin/trainers', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New trainer' }).click();
    const create = page.getByRole('dialog', { name: 'New trainer' });
    await create.getByLabel('Email').fill(`flow.trainer.${run}@example.test`);
    await create.getByLabel('Temporary password').fill(randomUUID());
    await create.getByLabel('First name').fill('Flow');
    await create.getByLabel('Last name').fill(`Trainer ${run}`);
    await create.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('link', { name: `Flow Trainer ${run}` }).click();
    await expect(page.getByRole('heading', { name: `Flow Trainer ${run}`, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Disable' }).click();
    await page.getByRole('dialog', { name: 'Disable trainer?' }).getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Disabled').first()).toBeVisible();

    await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Search clients' }).fill(client.email ?? '');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('link', { name: 'Ci Client' }).click();
    const assignment = page.getByRole('region', { name: 'Trainer assignment' });
    await assignment.getByRole('button', { name: 'Assign trainer' }).click();
    const assign = page.getByRole('dialog', { name: 'Assign trainer' });
    await expect(assign.getByRole('radio', { name: new RegExp(`Flow Trainer ${run}`) })).toHaveCount(0);
    await assign.getByRole('radio', { name: new RegExp(escapeRegExp(trainer.email ?? '')) }).check();
    await assign.getByRole('button', { name: 'Assign trainer' }).click();
    await expect(assignment.getByRole('link', { name: 'Ci Trainer' })).toBeVisible();
  });

  test('real backend trainer builds a template and activates a plan for the client', async ({ page }) => {
    await signIn(page, trainer);

    await page.goto('/trainer/exercises', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New exercise' }).click();
    const exercise = page.getByRole('dialog', { name: 'New exercise' });
    await exercise.getByLabel('Name', { exact: true }).fill(exerciseName);
    await exercise.getByLabel('Primary muscle').selectOption('QUADRICEPS');
    await exercise.getByLabel('Equipment').selectOption('BARBELL');
    await exercise.getByLabel('Difficulty').selectOption('BEGINNER');
    await exercise.getByRole('button', { name: 'New exercise' }).click();
    await expect(exercise).toHaveCount(0);

    await page.goto('/trainer/training', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New template' }).click();
    const template = page.getByRole('dialog', { name: 'Create workout template' });
    await template.getByLabel('Template name').fill(templateName);
    await template.getByRole('button', { name: 'Create template' }).click();
    await expect(page.getByRole('heading', { name: templateName })).toBeVisible();
    await page.getByRole('button', { name: 'Add exercise' }).first().click();
    const add = page.getByRole('dialog', { name: 'Add exercise' });
    await add.getByLabel('Search exercises').fill(exerciseName);
    await add.getByRole('button', { name: new RegExp(exerciseName) }).click();
    await add.getByRole('button', { name: 'Add exercise' }).click();
    await expect(page.getByText('1 exercise')).toBeVisible();
    await page.getByRole('button', { name: 'Activate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Activate', exact: true })).toHaveCount(0);

    await page.goto('/trainer/clients', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Open Ci Client' }).first().click();
    await page
      .getByRole('navigation', { name: 'Working with' })
      .getByRole('link', { name: 'Training', exact: true })
      .click();
    await page.getByLabel('Plan name').fill(planName);
    await page.getByRole('button', { name: 'New plan' }).last().click();
    await page.getByRole('link', { name: 'Open plan' }).first().click();
    await expect(page.getByRole('heading', { name: planName })).toBeVisible();
    await page.getByLabel('Template', { exact: true }).selectOption({ label: templateName });
    await page.getByRole('button', { name: 'Add workout from template' }).click();
    await expect(page.getByRole('paragraph').filter({ hasText: templateName })).toBeVisible();
    await page.getByRole('button', { name: 'Activate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
  });

  test('real backend client is notified of the plan and submits a check-in', async ({ page }) => {
    await signIn(page, client);

    await page.goto('/client/notifications', { waitUntil: 'domcontentloaded' });
    await expect(inboxItem(page, /training plan/i)).toBeVisible();

    await page.goto('/client/check-ins', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Start a check-in' }).click();
    await page.getByRole('button', { name: 'Create draft' }).click();
    await page.getByLabel('Training adherence').fill('90');
    await page.getByRole('button', { name: 'Submit check-in' }).click();
    await expect(page.getByRole('heading', { name: 'Waiting for review' })).toBeVisible();
  });

  test('real backend trainer is notified and reviews the check-in', async ({ page }) => {
    await signIn(page, trainer);

    await page.goto('/trainer/notifications', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /Notifications/ }),
    ).toContainText('unread');
    await inboxItem(page, /submitted a check-in/i).getByRole('link', { name: 'Open' }).click();
    await page.getByLabel('Feedback').fill(feedback);
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(page.getByText('Reviewed').first()).toBeVisible();
  });

  test('real backend client reads the review from its notification', async ({ page }) => {
    await signIn(page, client);

    await page.goto('/client/notifications', { waitUntil: 'domcontentloaded' });
    await inboxItem(page, /reviewed/i).getByRole('link', { name: 'Open' }).click();
    await expect(page).toHaveURL(/\/client\/check-ins\//);
    await expect(page.getByText(feedback)).toBeVisible();
  });
});
