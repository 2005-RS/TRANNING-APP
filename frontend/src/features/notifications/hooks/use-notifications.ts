import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsListQueryKey,
  useNotificationsList,
  useNotificationsMarkRead,
  useNotificationsReadAll,
  useNotificationsUnreadCount,
} from '@/generated/notifications/notifications';
import {
  NotificationsListReadState,
  type NotificationResponseDto,
  type PaginatedNotificationsResponseDto,
} from '@/generated/models';
import { invalidateNotificationQueries } from '@/features/notifications/lib/invalidate';
import type { NotificationsRole } from '@/features/notifications/lib/notification-content';
import {
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATIONS_STALE_TIME_MS,
  NOTIFICATIONS_UNREAD_REFETCH_MS,
} from '@/features/notifications/lib/query-policy';
import type { NotificationsView } from '@/features/notifications/lib/search';

export function useUnreadNotificationsCount() {
  return useNotificationsUnreadCount({
    query: {
      staleTime: NOTIFICATIONS_STALE_TIME_MS,
      refetchInterval: NOTIFICATIONS_UNREAD_REFETCH_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      select: (data) => data.unreadCount,
    },
  });
}

export function useNotificationInbox(view: NotificationsView, page: number) {
  return useNotificationsList(
    {
      page,
      limit: NOTIFICATIONS_PAGE_SIZE,
      readState: view === 'unread' ? NotificationsListReadState.UNREAD : NotificationsListReadState.ALL,
    },
    {
      query: {
        staleTime: NOTIFICATIONS_STALE_TIME_MS,
        refetchOnWindowFocus: true,
        placeholderData: keepPreviousData,
      },
    },
  );
}

function replaceInPage(
  page: PaginatedNotificationsResponseDto | undefined,
  updated: NotificationResponseDto,
): PaginatedNotificationsResponseDto | undefined {
  if (!page) {
    return page;
  }
  return {
    ...page,
    data: page.data.map((item) => (item.id === updated.id ? updated : item)),
  };
}

/**
 * Not optimistic: there is no mark-unread in v1, so a failed write must not
 * show as read. The server response is written into cached pages before the
 * refetch so the row does not flicker.
 */
export function useNotificationMutations(role: NotificationsRole) {
  const queryClient = useQueryClient();

  const markRead = useNotificationsMarkRead({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueriesData<PaginatedNotificationsResponseDto>(
          { queryKey: getNotificationsListQueryKey() },
          (page) => replaceInPage(page, updated),
        );
        return invalidateNotificationQueries(queryClient, role);
      },
    },
  });

  const readAll = useNotificationsReadAll({
    mutation: {
      onSuccess: () => invalidateNotificationQueries(queryClient, role),
    },
  });

  return { markRead, readAll };
}
