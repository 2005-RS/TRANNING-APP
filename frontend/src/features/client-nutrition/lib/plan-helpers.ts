import type { NutritionPlanMealResponseDto, NutritionPlanResponseDto } from '@/generated/models';
import { NutritionPlanMealResponseDtoMealType } from '@/generated/models';
import { finiteNumber } from '@/features/client-nutrition/lib/finite-number';

export const MEAL_TYPE_ORDER = [
  NutritionPlanMealResponseDtoMealType.BREAKFAST,
  NutritionPlanMealResponseDtoMealType.LUNCH,
  NutritionPlanMealResponseDtoMealType.DINNER,
  NutritionPlanMealResponseDtoMealType.SNACK,
  NutritionPlanMealResponseDtoMealType.OTHER,
] as const;

export type MealTypeKey = (typeof MEAL_TYPE_ORDER)[number];

export function sortedMeals(plan: NutritionPlanResponseDto): NutritionPlanMealResponseDto[] {
  return [...plan.meals].sort((a, b) => a.position - b.position);
}

export function sortedItems(meal: NutritionPlanMealResponseDto) {
  return [...meal.items].sort((a, b) => a.position - b.position);
}

/** Groups assigned meals like a diet-planner day board. Empty types are omitted. */
export function mealsByType(
  meals: readonly NutritionPlanMealResponseDto[],
): ReadonlyArray<{ type: MealTypeKey; meals: NutritionPlanMealResponseDto[] }> {
  const grouped = new Map<MealTypeKey, NutritionPlanMealResponseDto[]>();
  for (const type of MEAL_TYPE_ORDER) {
    grouped.set(type, []);
  }
  for (const meal of [...meals].sort((a, b) => a.position - b.position)) {
    grouped.get(meal.mealType)?.push(meal);
  }
  return MEAL_TYPE_ORDER.flatMap((type) => {
    const items = grouped.get(type) ?? [];
    return items.length > 0 ? [{ type, meals: items }] : [];
  });
}

/** Planned meal calories as a share of the prescribed daily target. Not intake. */
export function plannedOfTargetPercent(
  plannedKcal: number | null | undefined,
  targetKcal: number | null | undefined,
): number | null {
  const planned = finiteNumber(plannedKcal);
  const target = finiteNumber(targetKcal);
  if (planned === null || target === null || target <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, (planned / target) * 100));
}
