/** Body entries change on user action, not live telemetry. */
export const CLIENT_BODY_STALE_TIME_MS = 60_000;

export const CLIENT_BODY_MEASUREMENT_PAGE_SIZE = 20;

export const CLIENT_BODY_PHOTO_PAGE_SIZE = 20;

/** Signed GET URLs must not linger. Refetch before expiry via the access hook. */
export const CLIENT_BODY_PHOTO_ACCESS_GC_TIME_MS = 30_000;
