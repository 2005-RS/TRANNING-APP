import { roundNutrient, scalePer100, sumVectors } from './index';

describe('Nutrition Engine', () => {
  it('scales nutrient vectors and preserves unknown values', () => {
    expect(scalePer100({ energy_kcal: 200, fiber_g: null }, 150)).toEqual({
      energy_kcal: 300,
      fiber_g: null,
    });
  });

  it('sums complete nutrient vectors', () => {
    expect(sumVectors([{ protein_g: 20 }, { protein_g: 30 }])).toEqual({
      totals: { protein_g: 50 },
      completeness: { complete: true, missing: [] },
    });
  });

  it('reports mixed known and unknown values without discarding known totals', () => {
    expect(sumVectors([{ fiber_g: 10 }, { fiber_g: null }])).toEqual({
      totals: { fiber_g: 10 },
      completeness: { complete: false, missing: ['fiber_g'] },
    });
  });

  it('keeps all-unknown values null', () => {
    expect(sumVectors([{ fiber_g: null }, { fiber_g: null }])).toEqual({
      totals: { fiber_g: null },
      completeness: { complete: false, missing: ['fiber_g'] },
    });
  });

  it('rounds at the output boundary only', () => {
    expect(roundNutrient(0.1 + 0.2)).toBe(0.3);
  });
});
