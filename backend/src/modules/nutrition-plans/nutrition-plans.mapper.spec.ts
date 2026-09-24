import { NutritionMealType } from './enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from './enums/nutrition-plan-status.enum';
import { NutritionPlan } from './entities/nutrition-plan.entity';
import { NutritionPlanMeal } from './entities/nutrition-plan-meal.entity';
import { NutritionPlanMealItem } from './entities/nutrition-plan-meal-item.entity';
import { toNutritionPlanResponse } from './nutrition-plans.mapper';

describe('toNutritionPlanResponse', () => {
  it('derives item, meal, and plan totals from snapshots and keeps targets separate', () => {
    const itemA: NutritionPlanMealItem = {
      id: 'item-a',
      nutritionPlanMealId: 'meal-a',
      sourceFoodId: 'food-a',
      foodNameSnapshot: 'Exact A',
      brandSnapshot: null,
      quantityGrams: 150,
      caloriesPer100gSnapshot: 200,
      proteinGPer100gSnapshot: 20,
      carbohydratesGPer100gSnapshot: 30,
      fatGPer100gSnapshot: 5,
      fiberGPer100gSnapshot: 10,
      position: 1,
      notes: null,
    } as NutritionPlanMealItem;
    const itemB: NutritionPlanMealItem = {
      id: 'item-b',
      nutritionPlanMealId: 'meal-b',
      sourceFoodId: 'food-b',
      foodNameSnapshot: 'Exact B',
      brandSnapshot: null,
      quantityGrams: 100,
      caloriesPer100gSnapshot: 500,
      proteinGPer100gSnapshot: 40,
      carbohydratesGPer100gSnapshot: 60,
      fatGPer100gSnapshot: 12,
      fiberGPer100gSnapshot: 0,
      position: 1,
      notes: null,
    } as NutritionPlanMealItem;
    const meals: NutritionPlanMeal[] = [
      {
        id: 'meal-a',
        name: 'Meal A',
        mealType: NutritionMealType.BREAKFAST,
        position: 1,
        notes: null,
        items: [itemA],
      } as NutritionPlanMeal,
      {
        id: 'meal-b',
        name: 'Meal B',
        mealType: NutritionMealType.LUNCH,
        position: 2,
        notes: null,
        items: [itemB],
      } as NutritionPlanMeal,
    ];
    const plan = {
      id: 'plan-1',
      name: 'Hypertrophy Nutrition',
      description: null,
      status: NutritionPlanStatus.ACTIVE,
      startDate: '2026-09-01',
      endDate: null,
      targetCaloriesKcal: 2700,
      targetProteinG: 180,
      targetCarbohydratesG: 330,
      targetFatG: 70,
      clientProfileId: 'client-1',
      createdByUserId: 'trainer-a',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      archivedAt: null,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    } as NutritionPlan;

    const mapped = toNutritionPlanResponse(plan, meals);

    expect(mapped.meals[0].items[0].nutrition).toEqual({
      caloriesKcal: 300,
      proteinG: 30,
      carbohydratesG: 45,
      fatG: 7.5,
      fiberG: 15,
    });
    expect(mapped.mealPlanTotals).toEqual({
      caloriesKcal: 800,
      proteinG: 70,
      carbohydratesG: 105,
      fatG: 19.5,
      fiberG: 15,
    });
    expect(mapped.targets.caloriesKcal).toBe(2700);
    expect(mapped.targetDifferences.caloriesDifferenceKcal).toBe(-1900);
    expect(mapped.meals[0].items[0].foodName).toBe('Exact A');
  });
});
