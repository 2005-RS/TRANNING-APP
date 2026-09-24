/** Trainer workspace is operational, not live telemetry. */
export const TRAINER_STALE_TIME_MS = 60_000;

export const TRAINER_LIST_PAGE_SIZE = 20;

export const TRAINER_PROGRESS_BODY_LIMIT = 60;

export const TRAINER_PROGRESS_EXERCISE_LIMIT = 20;

export const TRAINER_SESSION_PREVIEW_LIMIT = 8;

/** Signed GET URLs must not linger in the Query cache. */
export const TRAINER_SIGNED_ACCESS_GC_TIME_MS = 30_000;

export const TRAINER_SIGNED_ACCESS_STALE_TIME_MS = 15_000;
