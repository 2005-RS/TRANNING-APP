import { describe, expect, it } from 'vitest';
import { minDate, today } from '@/features/client-subscription/lib/local-date';

describe('local subscription dates', () => {
  it('uses the local calendar date instead of UTC', () => {
    const localEvening = new Date(2026, 9, 10, 20, 30);
    expect(today(localEvening)).toBe('2026-10-10');
  });

  it('sets the minimum to 30 local calendar days ago', () => {
    expect(minDate(new Date(2026, 2, 1, 20, 30))).toBe('2026-01-30');
  });
});
