export type RestTimerSnapshot = {
  durationSeconds: number;
  startedAtMs: number;
};

/**
 * Remaining rest is derived from wall-clock timestamps, not from decrementing
 * a stored counter. Background tab throttling may delay the next tick; the
 * following tick still uses Date.now() so remaining catches up.
 *
 * Rest is transient UI state. Reloading the workout screen resets the timer.
 * The IN_PROGRESS session remains recoverable from the backend.
 */
export function remainingRestSeconds(
  snapshot: RestTimerSnapshot | null,
  nowMs: number,
): number {
  if (snapshot === null) {
    return 0;
  }

  const elapsedSeconds = Math.floor((nowMs - snapshot.startedAtMs) / 1000);
  return Math.max(0, snapshot.durationSeconds - elapsedSeconds);
}
