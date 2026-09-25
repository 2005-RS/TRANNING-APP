/**
 * There is no push channel in v1, so the unread badge polls while the tab is
 * visible. The endpoint is a single SQL COUNT; once a minute keeps the badge
 * honest without chatter. Hidden tabs do not poll.
 */
export const NOTIFICATIONS_UNREAD_REFETCH_MS = 60_000;

export const NOTIFICATIONS_STALE_TIME_MS = 30_000;

export const NOTIFICATIONS_PAGE_SIZE = 20;

/** Badge text caps here; the exact count is still announced to screen readers. */
export const NOTIFICATIONS_BADGE_MAX = 99;

export function badgeText(count: number): string {
  return count > NOTIFICATIONS_BADGE_MAX ? `${NOTIFICATIONS_BADGE_MAX}+` : String(count);
}
