import { delay, http, HttpResponse } from 'msw';
import type { NotificationResponseDto } from '@/generated/models';

const API = 'http://localhost:3000/api/v1/notifications';

type NotificationsMockState = {
  items: NotificationResponseDto[];
  delayMs: number;
  listStatus: number;
  markStatus: number;
  readAllStatus: number;
  unreadCountStatus: number;
  listRequests: URLSearchParams[];
  markedIds: string[];
  readAllCount: number;
};

export const notificationsMockState: NotificationsMockState = {
  items: [],
  delayMs: 0,
  listStatus: 200,
  markStatus: 200,
  readAllStatus: 200,
  unreadCountStatus: 200,
  listRequests: [],
  markedIds: [],
  readAllCount: 0,
};

export function resetNotificationsMockState(): void {
  notificationsMockState.items = [];
  notificationsMockState.delayMs = 0;
  notificationsMockState.listStatus = 200;
  notificationsMockState.markStatus = 200;
  notificationsMockState.readAllStatus = 200;
  notificationsMockState.unreadCountStatus = 200;
  notificationsMockState.listRequests = [];
  notificationsMockState.markedIds = [];
  notificationsMockState.readAllCount = 0;
}

export function setNotifications(items: NotificationResponseDto[]): void {
  notificationsMockState.items = items.map((item) => ({
    ...item,
    relatedEntity: { ...item.relatedEntity },
  }));
}

const READ_AT = '2026-09-22T12:00:00.000Z';

function errorBody(status: number, path: string) {
  return {
    statusCode: status,
    code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
    message: status === 404 ? 'Notification not found' : 'Request failed',
    path,
    timestamp: '2026-09-22T12:00:00.000Z',
    requestId: `req-notifications-${status}`,
  };
}

function unreadCount(): number {
  return notificationsMockState.items.filter((item) => !item.readAt).length;
}

export const notificationHandlers = [
  http.get(`${API}/unread-count`, () => {
    if (notificationsMockState.unreadCountStatus >= 400) {
      return HttpResponse.json(errorBody(notificationsMockState.unreadCountStatus, '/api/v1/notifications/unread-count'), {
        status: notificationsMockState.unreadCountStatus,
      });
    }
    return HttpResponse.json({ unreadCount: unreadCount() });
  }),
  http.get(API, async ({ request }) => {
    const url = new URL(request.url);
    notificationsMockState.listRequests.push(url.searchParams);
    if (notificationsMockState.delayMs > 0) {
      await delay(notificationsMockState.delayMs);
    }
    if (notificationsMockState.listStatus >= 400) {
      return HttpResponse.json(errorBody(notificationsMockState.listStatus, '/api/v1/notifications'), {
        status: notificationsMockState.listStatus,
      });
    }
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const readState = url.searchParams.get('readState') ?? 'ALL';
    const filtered = notificationsMockState.items.filter((item) =>
      readState === 'UNREAD' ? !item.readAt : readState === 'READ' ? Boolean(item.readAt) : true,
    );
    const start = (page - 1) * limit;
    return HttpResponse.json({
      data: filtered.slice(start, start + limit),
      meta: {
        page,
        limit,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  }),
  http.patch(`${API}/read-all`, () => {
    if (notificationsMockState.readAllStatus >= 400) {
      return HttpResponse.json(errorBody(notificationsMockState.readAllStatus, '/api/v1/notifications/read-all'), {
        status: notificationsMockState.readAllStatus,
      });
    }
    notificationsMockState.readAllCount += 1;
    const updatedCount = unreadCount();
    notificationsMockState.items = notificationsMockState.items.map((item) =>
      item.readAt ? item : { ...item, readAt: READ_AT },
    );
    return HttpResponse.json({ updatedCount });
  }),
  http.patch(`${API}/:notificationId/read`, ({ params }) => {
    const id = String(params.notificationId);
    notificationsMockState.markedIds.push(id);
    const index = notificationsMockState.items.findIndex((item) => item.id === id);
    if (notificationsMockState.markStatus >= 400 || index === -1) {
      const status = index === -1 ? 404 : notificationsMockState.markStatus;
      return HttpResponse.json(errorBody(status, `/api/v1/notifications/${id}/read`), { status });
    }
    const current = notificationsMockState.items[index]!;
    const updated = current.readAt ? current : { ...current, readAt: READ_AT };
    notificationsMockState.items[index] = updated;
    return HttpResponse.json(updated);
  }),
];
