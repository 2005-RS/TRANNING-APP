import { FoodNutrientDerivation } from '../../nutrition-foods/enums/food-nutrient-derivation.enum';
import {
  normalizeOpenFoodFactsProduct,
  toNonNegativeNumber,
} from './normalize-open-food-facts';

const amount = (
  result: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  code: string,
) => result?.nutrients.find((nutrient) => nutrient.code === code);

describe('normalizeOpenFoodFactsProduct', () => {
  const base = {
    product_name: 'Greek yogurt',
    nutriments: { proteins_100g: 10, carbohydrates_100g: 3.6, fat_100g: 2 },
  };

  it('parses numbers and numeric strings; negatives and garbage are unknown', () => {
    expect(toNonNegativeNumber('4.5')).toBe(4.5);
    expect(toNonNegativeNumber(3)).toBe(3);
    expect(toNonNegativeNumber(-1)).toBeNull();
    expect(toNonNegativeNumber('n/a')).toBeNull();
    expect(toNonNegativeNumber(undefined)).toBeNull();
  });

  it('prefers kcal, converts kJ, and falls back to Atwater marked as calculated', () => {
    const kcal = normalizeOpenFoodFactsProduct('11111111', {
      ...base,
      nutriments: { ...base.nutriments, 'energy-kcal_100g': 82 },
    });
    expect(amount(kcal, 'energy_kcal')).toMatchObject({
      amountPer100g: 82,
      derivation: FoodNutrientDerivation.MEASURED,
    });

    const kj = normalizeOpenFoodFactsProduct('11111111', {
      ...base,
      nutriments: { ...base.nutriments, energy_100g: 343 },
    });
    expect(amount(kj, 'energy_kcal')).toMatchObject({
      amountPer100g: 81.98,
      derivation: FoodNutrientDerivation.CALCULATED,
      sourceRef: 'energy_100g',
    });

    const atwater = normalizeOpenFoodFactsProduct('11111111', base);
    // 10*4 + 3.6*4 + 2*9
    expect(amount(atwater, 'energy_kcal')).toMatchObject({
      amountPer100g: 72.4,
      derivation: FoodNutrientDerivation.CALCULATED,
    });
  });

  it('converts minerals from grams, keeps missing values null, and prefers the Spanish name', () => {
    const result = normalizeOpenFoodFactsProduct('11111111', {
      ...base,
      product_name_es: 'Yogur griego',
      brands: 'Vital, Other',
      nutriments: {
        ...base.nutriments,
        sodium_100g: '0.05',
        'vitamin-d_100g': 0.0000011,
      },
    });
    expect(result).toMatchObject({
      name: 'Yogur griego',
      nameOriginal: 'Greek yogurt',
      brand: 'Vital',
    });
    expect(amount(result, 'sodium_mg')?.amountPer100g).toBe(50);
    expect(amount(result, 'vitamin_d_ug')?.amountPer100g).toBe(1.1);
    expect(amount(result, 'calcium_mg')?.amountPer100g).toBeNull();
  });

  it('rejects products without core macros or with impossible values', () => {
    expect(
      normalizeOpenFoodFactsProduct('11111111', {
        product_name: 'Soda',
        nutriments: { carbohydrates_100g: 10, fat_100g: 0 },
      }),
    ).toBeNull();
    expect(
      normalizeOpenFoodFactsProduct('11111111', {
        ...base,
        nutriments: { ...base.nutriments, fat_100g: 180 },
      }),
    ).toBeNull();
    expect(
      normalizeOpenFoodFactsProduct('11111111', {
        nutriments: base.nutriments,
      }),
    ).toBeNull();
  });

  it('turns a sane serving into a portion and ignores absurd ones', () => {
    expect(
      normalizeOpenFoodFactsProduct('11111111', {
        ...base,
        serving_quantity: '125',
        serving_size: '1 pot (125 g)',
      })?.portions,
    ).toEqual([{ label: '1 pot (125 g)', gramWeight: 125 }]);
    expect(
      normalizeOpenFoodFactsProduct('11111111', {
        ...base,
        serving_quantity: 9000,
      })?.portions,
    ).toEqual([]);
  });
});
