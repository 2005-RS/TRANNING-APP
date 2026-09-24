/**
 * Progress analytics is user-relevant, not live telemetry.
 * Fresh for two minutes; window-focus refetch stays off via the app QueryClient.
 */
export const CLIENT_PROGRESS_STALE_TIME_MS = 120_000;

export const CLIENT_PROGRESS_EXERCISE_LIST_LIMIT = 20;

export const CLIENT_PROGRESS_BODY_LIST_LIMIT = 60;

export const CLIENT_PROGRESS_EXERCISE_HISTORY_LIMIT = 20;
