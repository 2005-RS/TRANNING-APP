const STALE_SESSION_MS = 12 * 60 * 60 * 1000;

export function isStaleSession(startedAt: string, now = Date.now()): boolean {
  const started = Date.parse(startedAt);
  return Number.isFinite(started) && now - started > STALE_SESSION_MS;
}

export function staleSessionDays(startedAt: string, now = Date.now()): number {
  const started = Date.parse(startedAt);
  return Number.isFinite(started) ? Math.max(1, Math.floor((now - started) / 86_400_000)) : 1;
}
