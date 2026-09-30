import { NutritionPlanMealItem } from '../nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from '../nutrition-plans/entities/nutrition-plan-meal.entity';
import { NutritionPlan } from '../nutrition-plans/entities/nutrition-plan.entity';
import { NutritionMealType } from '../nutrition-plans/enums/nutrition-meal-type.enum';
import { FoodLogEntry } from './entities/food-log-entry.entity';
import {
  FoodLogEntryStatus,
  PlannedItemStatus,
} from './enums/food-log-entry-status.enum';
import { buildJournalDay } from './journal-day.builder';

function item(
  id: string,
  foodId: string,
  grams: number,
  per100: [number, number, number, number],
  position = 0,
): NutritionPlanMealItem {
  return {
    id,
    sourceFoodId: foodId,
    foodNameSnapshot: id,
    brandSnapshot: null,
    quantityGrams: grams,
    caloriesPer100gSnapshot: per100[0],
    proteinGPer100gSnapshot: per100[1],
    carbohydratesGPer100gSnapshot: per100[2],
    fatGPer100gSnapshot: per100[3],
    fiberGPer100gSnapshot: null,
    position,
  } as NutritionPlanMealItem;
}

function plan(): NutritionPlan {
  return {
    id: 'plan',
    name: 'Cut',
    targetCaloriesKcal: 2000,
    targetProteinG: 150,
    targetCarbohydratesG: null,
    targetFatG: null,
    meals: [
      {
        name: 'Lunch',
        mealType: NutritionMealType.LUNCH,
        position: 1,
        items: [item('chicken', 'food-chicken', 150, [165, 31, 0, 3.6])],
      } as NutritionPlanMeal,
      {
        name: 'Breakfast',
        mealType: NutritionMealType.BREAKFAST,
        position: 0,
        items: [
          item('yogurt', 'food-yogurt', 170, [97, 9, 3.9, 5], 1),
          item('oats', 'food-oats', 80, [389, 16.9, 66.3, 6.9], 0),
        ],
      } as NutritionPlanMeal,
    ],
  } as NutritionPlan;
}

function entry(overrides: Partial<FoodLogEntry>): FoodLogEntry {
  return {
    id: overrides.id ?? 'entry',
    mealType: NutritionMealType.SNACK,
    status: FoodLogEntryStatus.EATEN,
    planItemId: null,
    foodId: 'food-x',
    foodNameSnapshot: 'X',
    brandSnapshot: null,
    grams: 100,
    portionLabel: null,
    portionQuantity: null,
    caloriesKcal: 100,
    proteinG: 10,
    carbohydratesG: 10,
    fatG: 2,
    fiberG: null,
    note: null,
    createdAt: new Date('2026-09-30T08:00:00Z'),
    ...overrides,
  } as FoodLogEntry;
}

describe('buildJournalDay', () => {
  it('orders prescribed items by meal and item position, always listing five meals', () => {
    const day = buildJournalDay({
      date: '2026-09-30',
      plan: plan(),
      entries: [],
      editable: true,
    });
    expect(day.meals.map((meal) => meal.mealType)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'DINNER',
      'SNACK',
      'OTHER',
    ]);
    expect(
      day.meals[0].plannedItems.map((planned) => planned.planItemId),
    ).toEqual(['oats', 'yogurt']);
    // 311.2 + 164.9 + 247.5
    expect(day.planned.caloriesKcal).toBe(723.6);
    expect(day.remainingCaloriesKcal).toBe(2000);
    expect(day.adherence.pending).toBe(3);
  });

  it('derives eaten, replaced and skipped, and sums only eaten entries', () => {
    const day = buildJournalDay({
      date: '2026-09-30',
      plan: plan(),
      editable: true,
      entries: [
        entry({
          id: 'a',
          planItemId: 'oats',
          foodId: 'food-oats',
          mealType: NutritionMealType.BREAKFAST,
          caloriesKcal: 311.2,
        }),
        entry({
          id: 'b',
          planItemId: 'chicken',
          foodId: 'food-tofu',
          mealType: NutritionMealType.LUNCH,
          caloriesKcal: 200,
        }),
        entry({
          id: 'c',
          planItemId: 'yogurt',
          status: FoodLogEntryStatus.SKIPPED,
          foodId: null,
          grams: null,
          caloriesKcal: null,
          mealType: NutritionMealType.BREAKFAST,
        }),
        entry({ id: 'd', caloriesKcal: 150.5 }),
      ],
    });

    const statuses = day.meals.flatMap((meal) =>
      meal.plannedItems.map((planned) => [planned.planItemId, planned.status]),
    );
    expect(statuses).toEqual([
      ['oats', PlannedItemStatus.EATEN],
      ['yogurt', PlannedItemStatus.SKIPPED],
      ['chicken', PlannedItemStatus.REPLACED],
    ]);
    expect(day.consumed.caloriesKcal).toBe(661.7);
    expect(day.remainingCaloriesKcal).toBe(1338.3);
    expect(day.meals[3].extraEntries.map((extra) => extra.id)).toEqual(['d']);
    expect(day.adherence).toEqual({
      plannedItems: 3,
      eaten: 1,
      replaced: 1,
      skipped: 1,
      pending: 0,
    });
  });

  it('works without a plan: no targets, no remaining, extras only', () => {
    const day = buildJournalDay({
      date: '2026-09-30',
      plan: null,
      entries: [entry({ id: 'x', mealType: NutritionMealType.DINNER })],
      editable: false,
    });
    expect(day.plan).toBeNull();
    expect(day.remainingCaloriesKcal).toBeNull();
    expect(day.meals[2].extraEntries).toHaveLength(1);
    expect(day.consumed.caloriesKcal).toBe(100);
    expect(day.editable).toBe(false);
  });
});
