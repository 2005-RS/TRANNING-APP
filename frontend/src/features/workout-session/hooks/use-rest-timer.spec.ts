import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestTimer } from '@/features/workout-session/hooks/use-rest-timer';

const START = Date.parse('2026-09-04T14:00:00.000Z');

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the initial duration immediately', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => {
      result.current.start(90);
    });

    expect(result.current.remainingSeconds).toBe(90);
    expect(result.current.isResting).toBe(true);
    expect(result.current.isComplete).toBe(false);
  });

  it('counts down from wall-clock elapsed time, including +15 seconds', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => {
      result.current.start(90);
    });

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current.remainingSeconds).toBe(75);
  });

  it('catches up after a throttled background time jump', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => {
      result.current.start(90);
    });

    act(() => {
      vi.setSystemTime(START + 45_000);
      vi.advanceTimersByTime(250);
    });

    expect(result.current.remainingSeconds).toBe(45);
    expect(result.current.isResting).toBe(true);
  });

  it('reaches completion at zero and does not go negative', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => {
      result.current.start(90);
    });

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isResting).toBe(false);

    act(() => {
      vi.setSystemTime(START + 180_000);
      vi.advanceTimersByTime(250);
    });

    expect(result.current.remainingSeconds).toBe(0);
  });

  it('skip clears the transient rest clock', () => {
    const { result } = renderHook(() => useRestTimer());

    act(() => {
      result.current.start(90);
    });
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    act(() => {
      result.current.skip();
    });

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isResting).toBe(false);
    expect(result.current.isComplete).toBe(false);
  });
});
