import { useEffect, useId } from 'react';
import { toast } from 'sonner';
import type { NotificationResponseDto } from '@/generated/models';
import { NotificationTargetLink } from '@/features/notifications/components/notification-target-link';
import { useNotificationsCopy } from '@/features/notifications/copy';
import {
  useNotificationInbox,
  useNotificationMutations,
  useUnreadNotificationsCount,
} from '@/features/notifications/hooks/use-notifications';
import { mapNotificationsError } from '@/features/notifications/lib/map-error';
import {
  isUnread,
  notificationIcon,
  notificationTarget,
  notificationText,
  type NotificationsRole,
} from '@/features/notifications/lib/notification-content';
import {
  viewFromSearch,
  type NotificationsSearch,
  type NotificationsView,
} from '@/features/notifications/lib/search';
import { formatInstantDateTime, interpolate } from '@/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';

type Density = 'client' | 'productivity';

function densityFor(role: NotificationsRole): Density {
  return role === 'CLIENT' ? 'client' : 'productivity';
}

function surfaceClass(density: Density): string {
  return density === 'client' ? 'client-surface-card' : 'workspace-surface';
}

export function NotificationsInbox({
  role,
  search,
  onSearchChange,
}: {
  role: NotificationsRole;
  search: NotificationsSearch;
  onSearchChange: (next: NotificationsSearch) => void;
}) {
  const copy = useNotificationsCopy();
  const density = densityFor(role);
  const view = viewFromSearch(search);
  const page = search.page ?? 1;
  const inbox = useNotificationInbox(view, page);
  const unread = useUnreadNotificationsCount();
  const { readAll } = useNotificationMutations(role);
  const unreadCount = unread.data ?? 0;
  const totalPages = inbox.data?.meta.totalPages ?? 0;
  const description =
    role === 'CLIENT' ? copy.description.client : role === 'TRAINER' ? copy.description.trainer : copy.description.admin;

  // Reading items can shrink the Unread view below the current page.
  useEffect(() => {
    if (inbox.data && !inbox.isPlaceholderData && page > 1 && page > Math.max(totalPages, 1)) {
      onSearchChange({ ...search, page: undefined });
    }
  }, [inbox.data, inbox.isPlaceholderData, page, totalPages, search, onSearchChange]);

  function changeView(next: NotificationsView) {
    onSearchChange({ view: next === 'unread' ? 'unread' : undefined, page: undefined });
  }

  function onReadAll() {
    readAll.mutate(undefined, {
      onSuccess: () => toast.success(copy.markAllReadDone),
      onError: () => toast.error(copy.error.markFailed),
    });
  }

  return (
    <PageContainer density={density} className={cn(density === 'client' && 'mx-auto max-w-lg min-w-0')}>
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{description}</PageDescription>
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="outline"
            className={cn(density === 'client' ? 'min-h-12 w-full' : 'shrink-0')}
            disabled={readAll.isPending}
            onClick={onReadAll}
          >
            {readAll.isPending ? copy.markingAllRead : copy.markAllRead}
          </Button>
        ) : null}
      </PageHeader>

      <div className="space-y-4">
        <ViewFilter view={view} density={density} unreadCount={unreadCount} onChange={changeView} />

        {inbox.isPending ? (
          <InboxSkeleton density={density} />
        ) : inbox.isError ? (
          <InboxError
            density={density}
            error={inbox.error}
            retrying={inbox.isFetching}
            onRetry={() => {
              void inbox.refetch();
            }}
          />
        ) : inbox.data.data.length === 0 ? (
          <InboxEmpty density={density} view={view} onShowAll={() => changeView('all')} />
        ) : (
          <>
            <ul
              aria-label={copy.title}
              aria-busy={inbox.isPlaceholderData || undefined}
              className={cn(
                surfaceClass(density),
                'divide-y divide-border p-0 transition-opacity',
                density === 'client' && 'client-surface-card--flush',
                inbox.isPlaceholderData && 'opacity-60',
              )}
            >
              {inbox.data.data.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  role={role}
                  density={density}
                />
              ))}
            </ul>
            {totalPages > 1 ? (
              <InboxPagination
                density={density}
                page={page}
                totalPages={totalPages}
                disabled={inbox.isPlaceholderData}
                onPageChange={(next) => onSearchChange({ ...search, page: next > 1 ? next : undefined })}
              />
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}

function ViewFilter({
  view,
  density,
  unreadCount,
  onChange,
}: {
  view: NotificationsView;
  density: Density;
  unreadCount: number;
  onChange: (view: NotificationsView) => void;
}) {
  const copy = useNotificationsCopy();
  const options: Array<{ value: NotificationsView; label: string }> = [
    { value: 'all', label: copy.filters.all },
    { value: 'unread', label: copy.filters.unread },
  ];

  return (
    <div
      role="group"
      aria-label={copy.filters.label}
      className={cn(
        'inline-flex rounded-lg border border-border bg-muted/40 p-1',
        density === 'client' && 'grid w-full grid-cols-2',
      )}
    >
      {options.map((option) => {
        const active = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              density === 'client' ? 'min-h-11' : 'min-h-9',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.value === 'unread' && unreadCount > 0 ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-hidden>
                {unreadCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function NotificationRow({
  notification,
  role,
  density,
}: {
  notification: NotificationResponseDto;
  role: NotificationsRole;
  density: Density;
}) {
  const copy = useNotificationsCopy();
  const titleId = useId();
  const { markRead } = useNotificationMutations(role);
  const unread = isUnread(notification);
  const { title, body } = notificationText(notification, role);
  const Icon = notificationIcon(notification);
  const target = notificationTarget(notification, role);
  const createdAt = formatInstantDateTime(notification.createdAt);
  const client = density === 'client';

  function onMarkRead() {
    markRead.mutate(
      { notificationId: notification.id },
      { onError: () => toast.error(copy.error.markFailed) },
    );
  }

  function onOpen() {
    if (unread) {
      // Navigation proceeds either way; the inbox refetches when revisited.
      markRead.mutate({ notificationId: notification.id });
    }
  }

  return (
    <li
      className={cn(
        'flex gap-3',
        client ? 'flex-col px-4 py-4' : 'flex-col px-4 py-3 sm:flex-row sm:items-center',
        unread && 'bg-muted/30',
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full',
            client ? 'size-10' : 'size-9',
            unread ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className={client ? 'size-5' : 'size-4'} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p id={titleId} className={cn('text-sm', unread ? 'font-semibold' : 'font-medium text-muted-foreground')}>
              {title}
            </p>
            {unread ? <Badge variant="default">{copy.unread}</Badge> : null}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {createdAt ? (
            <p className="text-xs text-muted-foreground">
              <time dateTime={notification.createdAt}>{createdAt}</time>
            </p>
          ) : null}
        </div>
      </div>

      {target || unread ? (
        <div className={cn('flex shrink-0 gap-2', client ? 'pl-[3.25rem]' : 'sm:justify-end')}>
          {target ? (
            <NotificationTargetLink
              target={target}
              onClick={onOpen}
              aria-describedby={titleId}
              className={cn(
                buttonVariants({ variant: unread ? 'default' : 'outline', size: client ? 'default' : 'sm' }),
                client && 'min-h-11 flex-1',
              )}
            >
              {copy.open}
            </NotificationTargetLink>
          ) : null}
          {unread ? (
            <Button
              variant="ghost"
              size={client ? 'default' : 'sm'}
              className={cn(client && 'min-h-11 flex-1')}
              aria-describedby={titleId}
              disabled={markRead.isPending}
              onClick={onMarkRead}
            >
              {markRead.isPending ? copy.markingRead : copy.markRead}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function InboxPagination({
  density,
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  density: Density;
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const copy = useNotificationsCopy();
  const size = density === 'client' ? 'default' : 'sm';
  return (
    <nav aria-label={copy.pagination.label} className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        size={size}
        className={cn(density === 'client' && 'min-h-11')}
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {copy.pagination.previous}
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {interpolate(copy.pagination.page, { page, total: totalPages })}
      </p>
      <Button
        variant="outline"
        size={size}
        className={cn(density === 'client' && 'min-h-11')}
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {copy.pagination.next}
      </Button>
    </nav>
  );
}

function InboxEmpty({
  density,
  view,
  onShowAll,
}: {
  density: Density;
  view: NotificationsView;
  onShowAll: () => void;
}) {
  const copy = useNotificationsCopy();
  const unreadView = view === 'unread';
  return (
    <section className={cn(surfaceClass(density), 'space-y-3')} aria-labelledby="notifications-empty-title">
      <h2 id="notifications-empty-title" className="text-lg font-semibold tracking-tight">
        {unreadView ? copy.empty.unreadTitle : copy.empty.allTitle}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {unreadView ? copy.empty.unreadBody : copy.empty.allBody}
      </p>
      {unreadView ? (
        <Button variant="outline" className={cn(density === 'client' && 'min-h-12 w-full')} onClick={onShowAll}>
          {copy.empty.showAll}
        </Button>
      ) : null}
    </section>
  );
}

function InboxError({
  density,
  error,
  retrying,
  onRetry,
}: {
  density: Density;
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const copy = useNotificationsCopy();
  const mapped = mapNotificationsError(error);
  return (
    <section className={cn(surfaceClass(density), 'space-y-3')} aria-labelledby="notifications-error-title">
      <h2 id="notifications-error-title" className="text-lg font-semibold tracking-tight">
        {mapped.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{mapped.description}</p>
      <Button className={cn(density === 'client' && 'min-h-12 min-w-36')} disabled={retrying} onClick={onRetry}>
        {retrying ? copy.error.retrying : copy.error.retry}
      </Button>
    </section>
  );
}

function InboxSkeleton({ density }: { density: Density }) {
  const copy = useNotificationsCopy();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={copy.loadingLabel}
      className={cn(surfaceClass(density), 'space-y-5')}
    >
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
