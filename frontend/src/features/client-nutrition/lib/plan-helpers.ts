import type { NutritionPlanMealResponseDto, NutritionPlanResponseDto } from '@/generated/models';

export function sortedMeals(plan: NutritionPlanResponseDto): NutritionPlanMealResponseDto[] {
  return [...plan.meals].sort((a, b) => a.position - b.position);
}

export function sortedItems(meal: NutritionPlanMealResponseDto) {
  return [...meal.items].sort((a, b) => a.position - b.position);
}
