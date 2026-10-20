import { describe, expect, it } from 'vitest';
import { isStaleSession } from '@/features/workout-session/lib/stale-session';

describe('isStaleSession', () => {
  it('only marks sessions older than twelve hours as stale', () => {
    const now = Date.parse('2026-10-10T12:00:00.000Z');
    expect(isStaleSession('2026-10-10T00:00:00.000Z', now)).toBe(false);
    expect(isStaleSession('2026-10-09T23:59:59.000Z', now)).toBe(true);
  });
});
