import { describe, expect, it } from 'vitest';
import { NutritionPlanMealResponseDtoMealType } from '@/generated/models';
import {
  mealsByType,
  plannedOfTargetPercent,
} from '@/features/client-nutrition/lib/plan-helpers';
import { populatedNutritionPlan } from '@/features/client-nutrition/tests/fixtures';

describe('mealsByType', () => {
  it('keeps diet-planner day order and drops empty types', () => {
    const groups = mealsByType(populatedNutritionPlan.meals);
    expect(groups.map((group) => group.type)).toEqual([
      NutritionPlanMealResponseDtoMealType.BREAKFAST,
      NutritionPlanMealResponseDtoMealType.LUNCH,
      NutritionPlanMealResponseDtoMealType.DINNER,
    ]);
    expect(groups[0]?.meals[0]?.name).toBe('Morning plate');
  });
});

describe('plannedOfTargetPercent', () => {
  it('compares planned meals to the prescribed target without inventing intake', () => {
    expect(plannedOfTargetPercent(2380.5, 2450)).toBeCloseTo((2380.5 / 2450) * 100);
    expect(plannedOfTargetPercent(0, 2450)).toBe(0);
    expect(plannedOfTargetPercent(2450, 0)).toBeNull();
    expect(plannedOfTargetPercent(null, 2450)).toBeNull();
    expect(plannedOfTargetPercent(3000, 2000)).toBe(100);
  });
});
