import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useNotificationsCopy } from '@/features/notifications/copy';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications';
import { badgeText } from '@/features/notifications/lib/query-policy';
import { interpolate } from '@/i18n/format';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

export type NotificationsPath =
  | '/client/notifications'
  | '/trainer/notifications'
  | '/admin/notifications';

/** Visible count is decorative; the exact count is announced through `sr-only` text. */
export function UnreadCountBadge({ count, className }: { count: number; className?: string }) {
  const copy = useNotificationsCopy();
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[0.65rem] font-semibold leading-none text-primary-foreground tabular-nums',
        className,
      )}
    >
      <span aria-hidden>{badgeText(count)}</span>
      <span className="sr-only">{interpolate(copy.unreadCount, { count })}</span>
    </span>
  );
}

/**
 * Unread count for navigation. A failed count renders nothing: the badge is a
 * hint, and the inbox itself reports errors.
 */
export function NavUnreadBadge({ className }: { className?: string }) {
  const unread = useUnreadNotificationsCount();
  return <UnreadCountBadge count={unread.data ?? 0} className={className} />;
}

/** Small dot for the Client "More" tab, where a number would crowd the label. */
export function NavUnreadDot() {
  const copy = useNotificationsCopy();
  const unread = useUnreadNotificationsCount();
  const count = unread.data ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <>
      <span aria-hidden className="absolute right-[calc(50%-1rem)] top-2 size-2 rounded-full bg-primary" />
      <span className="sr-only">{interpolate(copy.unreadCount, { count })}</span>
    </>
  );
}

export function NotificationsBellLink({
  to,
  className,
}: {
  to: NotificationsPath;
  className?: string;
}) {
  const copy = useNotificationsCopy();
  const unread = useUnreadNotificationsCount();
  const count = unread.data ?? 0;
  const label = count > 0 ? `${copy.title}, ${interpolate(copy.unreadCount, { count })}` : copy.title;

  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative', className)}
    >
      <Bell className="size-5" aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[0.6rem] font-semibold leading-none text-primary-foreground tabular-nums"
        >
          {badgeText(count)}
        </span>
      ) : null}
    </Link>
  );
}
