import { describe, expect, it } from 'vitest';
import { remainingRestSeconds, type RestTimerSnapshot } from '@/features/workout-session/lib/rest-timer';

describe('remainingRestSeconds', () => {
  const startedAtMs = Date.parse('2026-09-04T14:00:00.000Z');
  const snapshot: RestTimerSnapshot = {
    durationSeconds: 90,
    startedAtMs,
  };

  it('returns the full duration at start', () => {
    expect(remainingRestSeconds(snapshot, startedAtMs)).toBe(90);
  });

  it('subtracts elapsed wall-clock seconds', () => {
    expect(remainingRestSeconds(snapshot, startedAtMs + 15_000)).toBe(75);
  });

  it('catches up after a background time jump without decrementing one-by-one', () => {
    expect(remainingRestSeconds(snapshot, startedAtMs + 45_000)).toBe(45);
  });

  it('completes at zero when duration has elapsed', () => {
    expect(remainingRestSeconds(snapshot, startedAtMs + 90_000)).toBe(0);
  });

  it('never returns a negative remaining duration', () => {
    expect(remainingRestSeconds(snapshot, startedAtMs + 180_000)).toBe(0);
  });

  it('treats a skipped/cleared snapshot as zero', () => {
    expect(remainingRestSeconds(null, startedAtMs + 15_000)).toBe(0);
  });
});
