import {
  roundNutrition,
  scaleNullablePer100,
  scalePer100,
  sumNutrition,
} from './nutrition-calc.util';

describe('nutrition-calc.util', () => {
  it('scales 150 g of 200/20/30/5/10 per 100 g to exact item totals', () => {
    expect(scalePer100(200, 150)).toBe(300);
    expect(scalePer100(20, 150)).toBe(30);
    expect(scalePer100(30, 150)).toBe(45);
    expect(scalePer100(5, 150)).toBe(7.5);
    expect(scalePer100(10, 150)).toBe(15);
  });

  it('sums meal totals without floating-point residue', () => {
    expect(sumNutrition([300, 500])).toBe(800);
    expect(sumNutrition([30, 40])).toBe(70);
    expect(sumNutrition([45, 60])).toBe(105);
    expect(sumNutrition([7.5, 12])).toBe(19.5);
  });

  it('keeps null fiber as null and rounds to two decimals', () => {
    expect(scaleNullablePer100(null, 150)).toBeNull();
    expect(roundNutrition(311.2)).toBe(311.2);
    expect(String(sumNutrition([0.1, 0.2]))).not.toMatch(/99999/);
  });
});
