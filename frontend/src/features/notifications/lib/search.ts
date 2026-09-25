export type NotificationsView = 'all' | 'unread';

export type NotificationsSearch = {
  view?: 'unread';
  page?: number;
};

function parsePage(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

export function validateNotificationsSearch(search: Record<string, unknown>): NotificationsSearch {
  const page = parsePage(search.page);
  return {
    ...(search.view === 'unread' ? { view: 'unread' as const } : {}),
    ...(page > 1 ? { page } : {}),
  };
}

export function viewFromSearch(search: NotificationsSearch): NotificationsView {
  return search.view === 'unread' ? 'unread' : 'all';
}
