import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { adminA, clientA, trainerA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { notificationsCopy } from '@/features/notifications/copy';
import {
  notificationsMockState,
  setNotifications,
} from '@/features/notifications/tests/msw-notifications';
import {
  CLIENT_PROFILE_ID,
  SUBMITTED_CHECK_IN_NOTIFICATION_CHECK_IN_ID,
  clientNotifications,
  nutritionPlanNotification,
  reviewedNotification,
  submittedNotification,
  trainingPlanNotification,
} from '@/features/notifications/tests/fixtures';
import { REVIEWED_CHECK_IN_ID } from '@/features/client-check-ins/tests/fixtures';
import type { AuthUserResponseDto } from '@/generated/models';

const timeout = 4000;
const types = notificationsCopy.types;

function renderInbox(entry: string, user: AuthUserResponseDto = clientA) {
  return render(<TestApp initialEntry={entry} status="AUTHENTICATED" user={user} />);
}

async function findInbox() {
  await screen.findByRole('heading', { name: notificationsCopy.title, level: 1 }, { timeout });
  return screen.findByRole('list', { name: notificationsCopy.title }, { timeout });
}

function rowFor(list: HTMLElement, title: string): HTMLElement {
  const heading = within(list).getByText(title);
  const row = heading.closest('li');
  if (!row) {
    throw new Error(`No row for ${title}`);
  }
  return row;
}

describe('Notifications inbox', { timeout: 15_000 }, () => {
  beforeAll(async () => {
    await import('@/features/notifications/components/notifications-pages');
  });
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });
  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows a skeleton while the inbox loads', async () => {
    notificationsMockState.delayMs = 2_000;
    renderInbox('/client/notifications');
    expect(
      await screen.findByRole('status', { name: notificationsCopy.loadingLabel }, { timeout }),
    ).toBeInTheDocument();
  });

  it('renders localized Client notifications with text read/unread status and deep links', async () => {
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    const list = await findInbox();

    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    const reviewed = rowFor(list, types.CHECK_IN_REVIEWED.title);
    expect(within(reviewed).getByText(types.CHECK_IN_REVIEWED.body)).toBeInTheDocument();
    expect(within(reviewed).getByText(notificationsCopy.unread)).toBeInTheDocument();
    expect(within(reviewed).getByRole('link', { name: notificationsCopy.open })).toHaveAttribute(
      'href',
      `/client/check-ins/${REVIEWED_CHECK_IN_ID}`,
    );

    const training = rowFor(list, types.TRAINING_PLAN_ACTIVATED.title);
    expect(within(training).queryByText(notificationsCopy.unread)).not.toBeInTheDocument();
    expect(within(training).queryByRole('button', { name: notificationsCopy.markRead })).not.toBeInTheDocument();
    expect(within(training).getByRole('link', { name: notificationsCopy.open })).toHaveAttribute(
      'href',
      '/client/training',
    );

    const nutrition = rowFor(list, types.NUTRITION_PLAN_ACTIVATED.title);
    expect(within(nutrition).getByRole('link', { name: notificationsCopy.open })).toHaveAttribute(
      'href',
      '/client/nutrition',
    );
    // No raw IDs or entity types leak into the UI.
    expect(screen.queryByText(reviewedNotification.id)).not.toBeInTheDocument();
    expect(screen.queryByText('CHECK_IN_REVIEWED')).not.toBeInTheDocument();
  });

  it('surfaces the unread count in the Client header and More navigation', async () => {
    const user = userEvent.setup();
    setNotifications(clientNotifications);
    renderInbox('/client/dashboard');

    expect(
      await screen.findByRole('link', { name: `${notificationsCopy.title}, 2 unread` }, { timeout }),
    ).toHaveAttribute('href', '/client/notifications');
    const more = screen.getByRole('button', { name: /More/ });
    expect(more).toHaveTextContent('2 unread');

    await user.click(more);
    const sheet = await screen.findByRole('dialog', undefined, { timeout });
    expect(within(sheet).getByRole('link', { name: /Notifications/ })).toHaveTextContent('2 unread');
  });

  it('shows no unread badge when everything is read', async () => {
    setNotifications([trainingPlanNotification]);
    renderInbox('/client/notifications');
    await findInbox();
    expect(screen.getByRole('link', { name: notificationsCopy.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: notificationsCopy.markAllRead })).not.toBeInTheDocument();
  });

  it('marks one notification as read and updates the badge', async () => {
    const user = userEvent.setup();
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    const list = await findInbox();
    await screen.findByRole('link', { name: `${notificationsCopy.title}, 2 unread` }, { timeout });

    const nutrition = rowFor(list, types.NUTRITION_PLAN_ACTIVATED.title);
    await user.click(within(nutrition).getByRole('button', { name: notificationsCopy.markRead }));

    await waitFor(() => {
      expect(within(nutrition).queryByText(notificationsCopy.unread)).not.toBeInTheDocument();
    });
    expect(notificationsMockState.markedIds).toEqual([nutritionPlanNotification.id]);
    expect(
      await screen.findByRole('link', { name: `${notificationsCopy.title}, 1 unread` }, { timeout }),
    ).toBeInTheDocument();
  });

  it('marks all as read once and hides the action', async () => {
    const user = userEvent.setup();
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    await findInbox();

    await user.click(await screen.findByRole('button', { name: notificationsCopy.markAllRead }, { timeout }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: notificationsCopy.markAllRead })).not.toBeInTheDocument();
    });
    expect(notificationsMockState.readAllCount).toBe(1);
    const list = screen.getByRole('list', { name: notificationsCopy.title });
    await waitFor(() => {
      expect(within(list).queryByText(notificationsCopy.unread)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: notificationsCopy.title })).toBeInTheDocument();
  });

  it('opening a deep link marks the notification read and navigates', async () => {
    const user = userEvent.setup();
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    const list = await findInbox();

    const training = rowFor(list, types.TRAINING_PLAN_ACTIVATED.title);
    await user.click(within(training).getByRole('link', { name: notificationsCopy.open }));
    expect(await screen.findByRole('heading', { name: 'Training', level: 1 }, { timeout })).toBeInTheDocument();
    // Already read: no redundant write.
    expect(notificationsMockState.markedIds).toEqual([]);
  });

  it('marks an unread item read when its deep link is opened', async () => {
    const user = userEvent.setup();
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    const list = await findInbox();

    const nutrition = rowFor(list, types.NUTRITION_PLAN_ACTIVATED.title);
    await user.click(within(nutrition).getByRole('link', { name: notificationsCopy.open }));
    await waitFor(() => {
      expect(notificationsMockState.markedIds).toEqual([nutritionPlanNotification.id]);
    });
  });

  it('filters to unread through the URL and shows the caught-up state', async () => {
    const user = userEvent.setup();
    setNotifications([trainingPlanNotification]);
    renderInbox('/client/notifications');
    await findInbox();

    await user.click(screen.getByRole('button', { name: notificationsCopy.filters.unread }));
    expect(
      await screen.findByRole('heading', { name: notificationsCopy.empty.unreadTitle }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: notificationsCopy.filters.unread })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(notificationsMockState.listRequests.at(-1)?.get('readState')).toBe('UNREAD');

    await user.click(screen.getByRole('button', { name: notificationsCopy.empty.showAll }));
    expect(await screen.findByText(types.TRAINING_PLAN_ACTIVATED.title, {}, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: notificationsCopy.filters.all })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('restores the Unread view from the URL', async () => {
    setNotifications(clientNotifications);
    renderInbox('/client/notifications?view=unread');
    const list = await findInbox();
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(notificationsMockState.listRequests[0]?.get('readState')).toBe('UNREAD');
  });

  it('pages through the inbox with the contract page size', async () => {
    const user = userEvent.setup();
    setNotifications(
      Array.from({ length: 25 }, (_, index) => ({
        ...trainingPlanNotification,
        id: `b${String(index).padStart(7, '0')}-bbbb-4111-8111-b11111111111`,
      })),
    );
    renderInbox('/client/notifications');
    const list = await findInbox();
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: notificationsCopy.pagination.next }));
    expect(await screen.findByText('Page 2 of 2', {}, { timeout })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByRole('list', { name: notificationsCopy.title })).getAllByRole('listitem')).toHaveLength(5);
    });
    const last = notificationsMockState.listRequests.at(-1);
    expect(last?.get('page')).toBe('2');
    expect(last?.get('limit')).toBe('20');
  });

  it('shows an honest empty inbox', async () => {
    renderInbox('/client/notifications');
    expect(
      await screen.findByRole('heading', { name: notificationsCopy.empty.allTitle }, { timeout }),
    ).toBeInTheDocument();
  });

  it('shows a retryable error without raw backend messages', async () => {
    const user = userEvent.setup();
    notificationsMockState.listStatus = 500;
    renderInbox('/client/notifications');
    const retry = await screen.findByRole('button', { name: notificationsCopy.error.retry }, { timeout: 8000 });
    expect(screen.queryByText('Request failed')).not.toBeInTheDocument();

    notificationsMockState.listStatus = 200;
    setNotifications([trainingPlanNotification]);
    await user.click(retry);
    expect(await screen.findByText(types.TRAINING_PLAN_ACTIVATED.title, {}, { timeout })).toBeInTheDocument();
  });

  it('keeps the unread badge silent when the count request fails', async () => {
    notificationsMockState.unreadCountStatus = 500;
    setNotifications(clientNotifications);
    renderInbox('/client/notifications');
    await findInbox();
    expect(screen.getByRole('link', { name: notificationsCopy.title })).toBeInTheDocument();
  });

  it('links a Trainer check-in notification to the review page and badges the sidebar', async () => {
    setNotifications([submittedNotification]);
    renderInbox('/trainer/notifications', trainerA);
    const list = await findInbox();

    const row = rowFor(list, types.CHECK_IN_SUBMITTED.title);
    expect(within(row).getByText(types.CHECK_IN_SUBMITTED.bodyTrainer)).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: notificationsCopy.open })).toHaveAttribute(
      'href',
      `/trainer/clients/${CLIENT_PROFILE_ID}/check-ins/${SUBMITTED_CHECK_IN_NOTIFICATION_CHECK_IN_ID}`,
    );
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    await waitFor(() => {
      expect(within(nav).getByRole('link', { name: /Notifications/ })).toHaveTextContent('1 unread');
    });
    expect(within(nav).getByRole('link', { name: /Notifications/ })).toHaveAttribute('aria-current', 'page');
  });

  it('omits a Trainer deep link when the notification has no Client profile', async () => {
    setNotifications([{ ...submittedNotification, clientProfileId: null }]);
    renderInbox('/trainer/notifications', trainerA);
    const list = await findInbox();
    const row = rowFor(list, types.CHECK_IN_SUBMITTED.title);
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: notificationsCopy.markRead })).toBeInTheDocument();
  });

  it('gives Admin a working inbox without Client-data deep links', async () => {
    const user = userEvent.setup();
    setNotifications([submittedNotification]);
    renderInbox('/admin/notifications', adminA);
    const list = await findInbox();
    const row = rowFor(list, types.CHECK_IN_SUBMITTED.title);
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: notificationsCopy.markRead }));
    await waitFor(() => {
      expect(notificationsMockState.markedIds).toEqual([submittedNotification.id]);
    });
  });
});
