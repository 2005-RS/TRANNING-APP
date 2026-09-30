import { NutrientUnit } from '../nutrition-nutrients/enums/nutrient-unit.enum';

export const NUTRITION_FOOD_NAME_MIN_LENGTH = 2;
export const NUTRITION_FOOD_NAME_MAX_LENGTH = 150;
export const NUTRITION_FOOD_BRAND_MAX_LENGTH = 150;
export const NUTRITION_FOOD_DESCRIPTION_MAX_LENGTH = 1_000;
export const NUTRITION_FOOD_SEARCH_MAX_LENGTH = 100;
export const NUTRITION_FOOD_LIST_DEFAULT_PAGE = 1;
export const NUTRITION_FOOD_LIST_DEFAULT_LIMIT = 20;
export const NUTRITION_FOOD_LIST_MAX_LIMIT = 100;
export const NUTRITION_FOOD_CALORIES_MIN = 0;
export const NUTRITION_FOOD_CALORIES_MAX = 99_999.99;
export const NUTRITION_FOOD_MACRO_MIN = 0;
export const NUTRITION_FOOD_MACRO_MAX = 1_000;
export const NUTRITION_FOOD_NUTRIENT_AMOUNT_MIN = 0;
/** Upper bound for the per-request nutrient array (the catalog has 16 non-core codes). */
export const NUTRITION_FOOD_NUTRIENTS_MAX_ITEMS = 32;
export const NUTRITION_FOOD_PORTIONS_MAX_ITEMS = 12;
export const NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH = 60;
export const NUTRITION_FOOD_PORTION_GRAMS_MIN = 0.1;
export const NUTRITION_FOOD_PORTION_GRAMS_MAX = 5_000;
export const NUTRITION_FOOD_NUTRIENT_AMOUNT_MAX_BY_UNIT: Record<
  NutrientUnit,
  number
> = {
  [NutrientUnit.KCAL]: NUTRITION_FOOD_CALORIES_MAX,
  [NutrientUnit.G]: NUTRITION_FOOD_MACRO_MAX,
  [NutrientUnit.MG]: 1_000_000,
  [NutrientUnit.UG]: 1_000_000,
};
