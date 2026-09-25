import type { QueryClient } from '@tanstack/react-query';
import {
  getNotificationsListQueryKey,
  getNotificationsUnreadCountQueryKey,
} from '@/generated/notifications/notifications';
import { getAdminDashboardGetSystemQueryKey } from '@/generated/admin-dashboard/admin-dashboard';
import { getClientDashboardGetMineQueryKey } from '@/generated/client-dashboard/client-dashboard';
import { getTrainerDashboardGetMineQueryKey } from '@/generated/trainer-dashboard/trainer-dashboard';
import type { NotificationsRole } from '@/features/notifications/lib/notification-content';

const DASHBOARD_KEY: Record<NotificationsRole, () => readonly unknown[]> = {
  CLIENT: () => getClientDashboardGetMineQueryKey(),
  TRAINER: () => getTrainerDashboardGetMineQueryKey(),
  ADMIN: () => getAdminDashboardGetSystemQueryKey(),
};

/**
 * Read state changes the inbox, the unread count, and the signed-in role's
 * dashboard summary (`notifications.unreadCount`). Nothing else.
 */
export function invalidateNotificationQueries(
  queryClient: QueryClient,
  role: NotificationsRole,
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getNotificationsListQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() }),
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY[role]() }),
  ]).then(() => undefined);
}
