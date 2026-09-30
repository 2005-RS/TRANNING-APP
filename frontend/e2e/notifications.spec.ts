import { expect, test, type Page, type Route } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

const clientUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client.a@example.test',
  firstName: 'Ada',
  lastName: 'Client',
  role: 'CLIENT',
};

const trainerUser = {
  id: '33333333-aaaa-4333-8333-333333333333',
  email: 'tess@example.test',
  firstName: 'Tess',
  lastName: 'Trainer',
  role: 'TRAINER',
};

const clientProfileId = '44444444-bbbb-4444-8444-444444444444';
const reviewedCheckInId = 'c3333333-cccc-4111-8111-c33333333333';
const submittedCheckInId = 'c7777777-cccc-4111-8111-c77777777777';

type MockNotification = {
  id: string;
  type: string;
  clientProfileId: string | null;
  relatedEntity: { type: string; id: string };
  readAt: string | null;
  createdAt: string;
};

function clientInbox(): MockNotification[] {
  return [
    {
      id: 'a1111111-aaaa-4111-8111-a11111111111',
      type: 'CHECK_IN_REVIEWED',
      clientProfileId,
      relatedEntity: { type: 'CHECK_IN', id: reviewedCheckInId },
      readAt: null,
      createdAt: '2026-09-20T09:30:00.000Z',
    },
    {
      id: 'a2222222-aaaa-4111-8111-a22222222222',
      type: 'TRAINING_PLAN_ACTIVATED',
      clientProfileId,
      relatedEntity: { type: 'TRAINING_PLAN', id: 't1111111-tttt-4111-8111-t11111111111' },
      readAt: '2026-09-19T10:00:00.000Z',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'a3333333-aaaa-4111-8111-a33333333333',
      type: 'NUTRITION_PLAN_ACTIVATED',
      clientProfileId,
      relatedEntity: { type: 'NUTRITION_PLAN', id: 'n1111111-nnnn-4111-8111-n11111111111' },
      readAt: null,
      createdAt: '2026-09-18T08:00:00.000Z',
    },
  ];
}

function trainerInbox(): MockNotification[] {
  return [
    {
      id: 'a4444444-aaaa-4111-8111-a44444444444',
      type: 'CHECK_IN_SUBMITTED',
      clientProfileId,
      relatedEntity: { type: 'CHECK_IN', id: submittedCheckInId },
      readAt: null,
      createdAt: '2026-09-21T15:00:00.000Z',
    },
  ];
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/**
 * Every API call is mocked. Unmocked paths get 404 so the suite never reaches
 * a real backend that may be running locally.
 */
async function mockSession(
  page: Page,
  user: typeof clientUser | typeof trainerUser,
  seed: MockNotification[],
) {
  const state = { items: seed.map((item) => ({ ...item })), marked: [] as string[], readAll: 0 };
  const readAt = '2026-09-22T12:00:00.000Z';

  await page.route('**/api/v1/**', async (route) => {
    await fulfillJson(
      route,
      {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Not mocked',
        path: new URL(route.request().url()).pathname,
        timestamp: readAt,
        requestId: 'req-e2e-404',
      },
      404,
    );
  });
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await fulfillJson(route, { accessToken: 'e2e-access-token', tokenType: 'Bearer', expiresIn: 900, user });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await fulfillJson(route, user);
  });
  await page.route('**/api/v1/notifications**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET' && path.endsWith('/notifications/unread-count')) {
      await fulfillJson(route, { unreadCount: state.items.filter((item) => !item.readAt).length });
      return;
    }
    if (request.method() === 'GET' && path.endsWith('/notifications')) {
      const unreadOnly = url.searchParams.get('readState') === 'UNREAD';
      const data = state.items.filter((item) => (unreadOnly ? !item.readAt : true));
      await fulfillJson(route, {
        data,
        meta: { page: 1, limit: 20, totalItems: data.length, totalPages: data.length > 0 ? 1 : 0 },
      });
      return;
    }
    if (request.method() === 'PATCH' && path.endsWith('/notifications/read-all')) {
      state.readAll += 1;
      const updatedCount = state.items.filter((item) => !item.readAt).length;
      state.items = state.items.map((item) => (item.readAt ? item : { ...item, readAt }));
      await fulfillJson(route, { updatedCount });
      return;
    }
    const markMatch = /\/notifications\/([^/]+)\/read$/.exec(path);
    if (request.method() === 'PATCH' && markMatch) {
      const id = markMatch[1]!;
      state.marked.push(id);
      const index = state.items.findIndex((item) => item.id === id);
      if (index === -1) {
        await route.fallback();
        return;
      }
      state.items[index] = { ...state.items[index]!, readAt: state.items[index]!.readAt ?? readAt };
      await fulfillJson(route, state.items[index]);
      return;
    }
    await route.fallback();
  });

  return state;
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('notifications', () => {
  test('client reads notifications from the header bell and clears the badge', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const state = await mockSession(page, clientUser, clientInbox());
    await page.goto('/client/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible({ timeout: 20_000 });
    const bell = page.getByRole('link', { name: 'Notifications, 2 unread' });
    await expect(bell).toBeVisible();
    const inbox = page.getByRole('list', { name: 'Notifications' });
    await expect(inbox.getByRole('listitem')).toHaveCount(3);
    await expect(inbox.getByRole('link', { name: 'Open' }).first()).toHaveAttribute(
      'href',
      `/client/check-ins/${reviewedCheckInId}`,
    );

    await page.getByRole('button', { name: 'Unread', exact: true }).click();
    await expect(page).toHaveURL(/view=unread/);
    await expect(inbox.getByRole('listitem')).toHaveCount(2);

    const nutrition = inbox.getByRole('listitem').filter({ hasText: 'Nutrition plan active' });
    await nutrition.getByRole('button', { name: 'Mark as read' }).click();
    await expect(page.getByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();
    await expect(inbox.getByRole('listitem')).toHaveCount(1);
    expect(state.marked).toEqual(['a3333333-aaaa-4111-8111-a33333333333']);

    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(page.getByRole('heading', { name: 'You are all caught up' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);
    expect(state.readAll).toBe(1);
    await assertNoHorizontalOverflow(page);
  });

  test('client opens a deep link, which marks it read', async ({ page }) => {
    test.setTimeout(60_000);
    const state = await mockSession(page, clientUser, clientInbox());
    await page.goto('/client/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const inbox = page.getByRole('list', { name: 'Notifications' });
    const nutrition = inbox.getByRole('listitem').filter({ hasText: 'Nutrition plan active' });
    await nutrition.getByRole('link', { name: 'Open' }).click({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/client\/nutrition$/);
    await expect.poll(() => state.marked).toEqual(['a3333333-aaaa-4111-8111-a33333333333']);
  });

  test('trainer sees a sidebar badge and a review deep link', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockSession(page, trainerUser, trainerInbox());
    await page.goto('/trainer/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible({ timeout: 20_000 });
    const sidebarLink = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /Notifications/ });
    await expect(sidebarLink).toContainText('1 unread');
    await expect(sidebarLink).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('A Client submitted a check-in for review.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      `/trainer/clients/${clientProfileId}/check-ins/${submittedCheckInId}`,
    );
    await assertNoHorizontalOverflow(page);
  });

  test('inboxes have no serious accessibility violations', async ({ page }) => {
    test.setTimeout(60_000);
    await mockSession(page, clientUser, clientInbox());
    await page.goto('/client/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('listitem')).toHaveCount(3, {
      timeout: 20_000,
    });
    await expectNoSeriousA11yViolations(page, 'client inbox');

    await page.getByRole('button', { name: 'Unread', exact: true }).click();
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(page.getByRole('heading', { name: 'You are all caught up' })).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'client inbox, empty');
  });

  test('trainer inbox has no serious accessibility violations', async ({ page }) => {
    test.setTimeout(60_000);
    await mockSession(page, trainerUser, trainerInbox());
    await page.goto('/trainer/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByText('A Client submitted a check-in for review.')).toBeVisible({ timeout: 20_000 });
    await expectNoSeriousA11yViolations(page, 'trainer inbox');
  });

  for (const width of [320, 375, 430, 768, 1024, 1440] as const) {
    test(`client inbox does not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 900 });
      await mockSession(page, clientUser, clientInbox());
      await page.goto('/client/notifications', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('listitem')).toHaveCount(3, {
        timeout: 20_000,
      });
      await assertNoHorizontalOverflow(page);
    });
  }
});
