/**
 * Current IN_PROGRESS session is used for resume after leaving the gym screen.
 * A short stale window plus window-focus refetch recovers that session without
 * turning the dashboard into live telemetry.
 */
export const CURRENT_WORKOUT_SESSION_STALE_TIME_MS = 15_000;

/** Session detail is the recording surface; keep it fresh after each write. */
export const WORKOUT_SESSION_DETAIL_STALE_TIME_MS = 5_000;

/** Plan structure changes rarely compared with an in-progress session. */
export const CURRENT_TRAINING_PLAN_STALE_TIME_MS = 60_000;
