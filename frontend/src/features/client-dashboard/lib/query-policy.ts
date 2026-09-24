import { ClientDashboardGetMinePeriodDays } from '@/generated/models';

/** Rolling 7-day window matches the Home weekly activity module. */
export const CLIENT_DASHBOARD_PERIOD_DAYS =
  ClientDashboardGetMinePeriodDays.NUMBER_7;

/**
 * Dashboard is user-relevant, not live telemetry.
 * Fresh for one minute; window-focus refetch stays off via the app QueryClient.
 */
export const CLIENT_DASHBOARD_STALE_TIME_MS = 60_000;
