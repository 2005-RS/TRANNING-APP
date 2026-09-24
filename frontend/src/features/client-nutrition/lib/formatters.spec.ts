import { describe, expect, it } from 'vitest';
import { finiteNumber } from '@/features/client-nutrition/lib/finite-number';
import {
  formatGrams,
  formatKcal,
  formatNutritionAmount,
  formatSignedKcal,
} from '@/features/client-nutrition/lib/formatters';
import { macroShare } from '@/features/client-nutrition/lib/macro-share';

describe('finiteNumber', () => {
  it('keeps zero and decimals, and treats non-finite as absence', () => {
    expect(finiteNumber(0)).toBe(0);
    expect(finiteNumber(62.5)).toBe(62.5);
    expect(finiteNumber(150.5)).toBe(150.5);
    expect(finiteNumber(null)).toBeNull();
    expect(finiteNumber(Number.NaN)).toBeNull();
    expect(finiteNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(finiteNumber('62.5')).toBeNull();
  });
});

describe('nutrition formatters', () => {
  it('preserves 62.5 and 150.5 grams', () => {
    expect(formatGrams(62.5)).toBe('62.5 g');
    expect(formatGrams(150.5)).toBe('150.5 g');
    expect(formatGrams(0)).toBe('0 g');
    expect(formatGrams(null)).toBeNull();
  });

  it('formats kcal without inventing values', () => {
    expect(formatKcal(2450)).toBe('2,450 kcal');
    expect(formatKcal(2380.5)).toBe('2,380.5 kcal');
    expect(formatKcal(0)).toBe('0 kcal');
    expect(formatKcal(Number.NaN)).toBeNull();
  });

  it('formats signed differences without remaining-calorie language', () => {
    expect(formatSignedKcal(-69.5)).toBe('−69.5 kcal');
    expect(formatSignedKcal(0)).toBe('0 kcal');
    expect(formatNutritionAmount(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('macroShare', () => {
  it('omits visualization when fewer than two macros exist', () => {
    expect(macroShare({ proteinG: 180 })).toBeNull();
    expect(macroShare({ proteinG: 0, carbohydratesG: 0, fatG: 0 })).toBeNull();
  });

  it('uses finite grams only', () => {
    const share = macroShare({ proteinG: 180, carbohydratesG: 260, fatG: 70 });
    expect(share?.total).toBe(510);
  });
});
