import { FoodNutrientDerivation } from '../../nutrition-foods/enums/food-nutrient-derivation.enum';
import { OpenFoodFactsProduct } from './open-food-facts.client';

const KJ_PER_KCAL = 4.184;

/** Our nutrient code → OFF `nutriments` key (per 100 g) and unit factor into our unit. */
const NUTRIENT_MAP: ReadonlyArray<{
  code: string;
  key: string;
  factor: number;
}> = [
  { code: 'protein_g', key: 'proteins_100g', factor: 1 },
  { code: 'carbohydrates_g', key: 'carbohydrates_100g', factor: 1 },
  { code: 'fat_g', key: 'fat_100g', factor: 1 },
  { code: 'fiber_g', key: 'fiber_100g', factor: 1 },
  { code: 'sugars_g', key: 'sugars_100g', factor: 1 },
  { code: 'saturated_fat_g', key: 'saturated-fat_100g', factor: 1 },
  { code: 'monounsaturated_fat_g', key: 'monounsaturated-fat_100g', factor: 1 },
  { code: 'polyunsaturated_fat_g', key: 'polyunsaturated-fat_100g', factor: 1 },
  // OFF reports these minerals in grams per 100 g.
  { code: 'cholesterol_mg', key: 'cholesterol_100g', factor: 1_000 },
  { code: 'sodium_mg', key: 'sodium_100g', factor: 1_000 },
  { code: 'potassium_mg', key: 'potassium_100g', factor: 1_000 },
  { code: 'calcium_mg', key: 'calcium_100g', factor: 1_000 },
  { code: 'iron_mg', key: 'iron_100g', factor: 1_000 },
  { code: 'magnesium_mg', key: 'magnesium_100g', factor: 1_000 },
  { code: 'zinc_mg', key: 'zinc_100g', factor: 1_000 },
  { code: 'vitamin_c_mg', key: 'vitamin-c_100g', factor: 1_000 },
  { code: 'vitamin_a_ug', key: 'vitamin-a_100g', factor: 1_000_000 },
  { code: 'vitamin_d_ug', key: 'vitamin-d_100g', factor: 1_000_000 },
  { code: 'vitamin_b12_ug', key: 'vitamin-b12_100g', factor: 1_000_000 },
  { code: 'folate_ug', key: 'folates_100g', factor: 1_000_000 },
];

export interface NormalizedNutrient {
  code: string;
  amountPer100g: number | null;
  derivation: FoodNutrientDerivation;
  sourceRef: string;
}

export interface NormalizedExternalFood {
  externalId: string;
  name: string;
  nameOriginal: string;
  brand: string | null;
  nutrients: NormalizedNutrient[];
  portions: Array<{ label: string; gramWeight: number }>;
}

/** OFF values arrive as numbers, numeric strings, or garbage. Negative → unknown. */
export function toNonNegativeNumber(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  // No rounding here: micro-nutrients arrive in grams (e.g. 0.0000011 g vitamin D)
  // and are only rounded after conversion into mg/µg.
  return parsed;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

/**
 * Normalizes an OFF product into our single Food representation.
 * Returns null when the product lacks the core macros we require (never guessed, D3).
 */
export function normalizeOpenFoodFactsProduct(
  barcode: string,
  product: OpenFoodFactsProduct,
): NormalizedExternalFood | null {
  const nutriments = product.nutriments ?? {};
  const nameOriginal =
    cleanText(product.product_name, 300) ??
    cleanText(product.product_name_es, 300) ??
    cleanText(product.generic_name_es, 300);
  if (!nameOriginal) {
    return null;
  }
  const displayName =
    cleanText(product.product_name_es, 150) ?? nameOriginal.slice(0, 150);

  const nutrients: NormalizedNutrient[] = NUTRIENT_MAP.map(
    ({ code, key, factor }) => {
      const raw = toNonNegativeNumber(nutriments[key]);
      return {
        code,
        amountPer100g:
          raw === null ? null : Math.round(raw * factor * 10_000) / 10_000,
        derivation: FoodNutrientDerivation.MEASURED,
        sourceRef: key,
      };
    },
  );

  const byCode = new Map(
    nutrients.map((nutrient) => [nutrient.code, nutrient]),
  );
  const protein = byCode.get('protein_g')!.amountPer100g;
  const carbohydrates = byCode.get('carbohydrates_g')!.amountPer100g;
  const fat = byCode.get('fat_g')!.amountPer100g;
  if (protein === null || carbohydrates === null || fat === null) {
    return null;
  }
  // Physically impossible per-100 g values mean corrupt community data: reject.
  if (protein > 100 || carbohydrates > 100 || fat > 100) {
    return null;
  }

  let energy = toNonNegativeNumber(nutriments['energy-kcal_100g']);
  let energyRef = 'energy-kcal_100g';
  let energyDerivation = FoodNutrientDerivation.MEASURED;
  if (energy === null) {
    const kilojoules = toNonNegativeNumber(nutriments['energy_100g']);
    if (kilojoules !== null) {
      energy = Math.round((kilojoules / KJ_PER_KCAL) * 100) / 100;
      energyRef = 'energy_100g';
      energyDerivation = FoodNutrientDerivation.CALCULATED;
    }
  }
  if (energy === null) {
    energy =
      Math.round((protein * 4 + carbohydrates * 4 + fat * 9) * 100) / 100;
    energyRef = 'atwater:4-4-9';
    energyDerivation = FoodNutrientDerivation.CALCULATED;
  }
  if (energy > 950) {
    return null;
  }
  nutrients.unshift({
    code: 'energy_kcal',
    amountPer100g: energy,
    derivation: energyDerivation,
    sourceRef: energyRef,
  });

  const portions: Array<{ label: string; gramWeight: number }> = [];
  const servingGrams = toNonNegativeNumber(product.serving_quantity);
  if (servingGrams !== null && servingGrams > 0 && servingGrams <= 5_000) {
    portions.push({
      label: cleanText(product.serving_size, 60) ?? `${servingGrams} g`,
      gramWeight: servingGrams,
    });
  }

  return {
    externalId: barcode,
    name: displayName,
    nameOriginal,
    brand: cleanText(product.brands?.split(',')[0], 150),
    nutrients,
    portions,
  };
}
