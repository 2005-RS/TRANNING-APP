export const DASHBOARD_PERIOD_DAYS = [7, 30, 90] as const;
export type DashboardPeriodDays = (typeof DASHBOARD_PERIOD_DAYS)[number];
export const DASHBOARD_DEFAULT_PERIOD_DAYS: DashboardPeriodDays = 30;

export const DASHBOARD_INACTIVITY_DAYS = [7, 14, 30] as const;
export type DashboardInactivityDays =
  (typeof DASHBOARD_INACTIVITY_DAYS)[number];
export const DASHBOARD_DEFAULT_INACTIVITY_DAYS: DashboardInactivityDays = 7;

export const CLIENT_RECENT_COMPLETED_SESSIONS_MAX = 5;
export const TRAINER_RECENT_COMPLETED_SESSIONS_MAX = 10;
export const TRAINER_PENDING_CHECK_INS_MAX = 5;
export const TRAINER_INACTIVITY_LIST_MAX = 10;
export const TRAINER_MISSING_PLAN_LIST_MAX = 10;

export const TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE = 1;
export const TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT = 20;
export const TRAINER_CLIENT_OVERVIEW_MAX_LIMIT = 100;
export const TRAINER_CLIENT_OVERVIEW_SEARCH_MAX_LENGTH = 100;

export const DASHBOARD_METRIC_SCALE = 2;
