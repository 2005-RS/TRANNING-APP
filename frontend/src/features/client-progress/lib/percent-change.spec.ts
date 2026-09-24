import { describe, expect, it } from 'vitest';
import { absoluteChange, percentChange } from '@/features/client-progress/lib/percent-change';

describe('percentChange', () => {
  it('computes a finite percent from a non-zero baseline', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 100)).toBe(-100);
  });

  it('treats zero current and previous as 0%, not NaN', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('returns null when the previous value is zero and current is not', () => {
    expect(percentChange(10, 0)).toBeNull();
  });

  it('returns null for null, undefined, or non-finite values', () => {
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(Number.NaN, 10)).toBeNull();
    expect(percentChange(10, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('absoluteChange', () => {
  it('subtracts previous from current, including zero', () => {
    expect(absoluteChange(81, 82.4)).toBeCloseTo(-1.4);
    expect(absoluteChange(0, 0)).toBe(0);
    expect(absoluteChange(null, 10)).toBeNull();
  });
});
