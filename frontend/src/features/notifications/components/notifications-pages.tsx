import { useNavigate, useSearch } from '@tanstack/react-router';
import { NotificationsInbox } from '@/features/notifications/components/notifications-inbox';
import type { NotificationsSearch } from '@/features/notifications/lib/search';

/**
 * One route component per role so search state stays typed against its own
 * route. The inbox is the same `/notifications` contract for every role.
 */
export function ClientNotificationsPage() {
  const search = useSearch({ from: '/client/notifications' });
  const navigate = useNavigate({ from: '/client/notifications' });
  return (
    <NotificationsInbox
      role="CLIENT"
      search={search}
      onSearchChange={(next: NotificationsSearch) => void navigate({ search: next, replace: true })}
    />
  );
}

export function TrainerNotificationsPage() {
  const search = useSearch({ from: '/trainer/notifications' });
  const navigate = useNavigate({ from: '/trainer/notifications' });
  return (
    <NotificationsInbox
      role="TRAINER"
      search={search}
      onSearchChange={(next: NotificationsSearch) => void navigate({ search: next, replace: true })}
    />
  );
}

export function AdminNotificationsPage() {
  const search = useSearch({ from: '/admin/notifications' });
  const navigate = useNavigate({ from: '/admin/notifications' });
  return (
    <NotificationsInbox
      role="ADMIN"
      search={search}
      onSearchChange={(next: NotificationsSearch) => void navigate({ search: next, replace: true })}
    />
  );
}
