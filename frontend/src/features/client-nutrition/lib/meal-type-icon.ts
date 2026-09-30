import { Apple, Coffee, Moon, Sun, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NutritionPlanMealResponseDtoMealType } from '@/generated/models';
import type { MealTypeKey } from '@/features/client-nutrition/lib/plan-helpers';

const MEAL_ICONS: Record<MealTypeKey, LucideIcon> = {
  [NutritionPlanMealResponseDtoMealType.BREAKFAST]: Coffee,
  [NutritionPlanMealResponseDtoMealType.LUNCH]: Sun,
  [NutritionPlanMealResponseDtoMealType.DINNER]: Moon,
  [NutritionPlanMealResponseDtoMealType.SNACK]: Apple,
  [NutritionPlanMealResponseDtoMealType.OTHER]: Utensils,
};

export function mealTypeIcon(type: MealTypeKey): LucideIcon {
  return MEAL_ICONS[type];
}
