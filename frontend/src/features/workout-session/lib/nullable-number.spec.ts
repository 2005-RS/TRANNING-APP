import { describe, expect, it } from 'vitest';
import {
  finiteOrZero,
  normalizeNullableNumber,
} from '@/features/workout-session/lib/nullable-number';

describe('normalizeNullableNumber', () => {
  it('accepts integers', () => {
    expect(normalizeNullableNumber(8)).toBe(8);
  });

  it('preserves decimal kilograms such as 62.5', () => {
    expect(normalizeNullableNumber(62.5)).toBe(62.5);
  });

  it('accepts zero', () => {
    expect(normalizeNullableNumber(0)).toBe(0);
  });

  it('keeps null as null', () => {
    expect(normalizeNullableNumber(null)).toBeNull();
  });

  it('rejects undefined, non-finite numbers, and malformed objects', () => {
    expect(normalizeNullableNumber(undefined)).toBeNull();
    expect(normalizeNullableNumber(Number.NaN)).toBeNull();
    expect(normalizeNullableNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeNullableNumber({})).toBeNull();
    expect(normalizeNullableNumber({ value: 62.5 })).toBeNull();
    expect(normalizeNullableNumber('62.5')).toBeNull();
  });
});

describe('finiteOrZero', () => {
  it('uses zero when the contract value is missing or malformed', () => {
    expect(finiteOrZero(62.5)).toBe(62.5);
    expect(finiteOrZero(null)).toBe(0);
    expect(finiteOrZero({})).toBe(0);
  });
});
