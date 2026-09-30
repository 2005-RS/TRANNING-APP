import {
  NutrientVector,
  roundNutrient,
  scalePer100,
  sumVectors,
} from '../nutrition-engine';
import { NutritionPlanMealItem } from '../nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionPlan } from '../nutrition-plans/entities/nutrition-plan.entity';
import { NutritionMealType } from '../nutrition-plans/enums/nutrition-meal-type.enum';
import {
  JournalDayResponseDto,
  JournalEntryDto,
  JournalEntryNutritionDto,
  JournalMacrosDto,
  JournalMealDto,
  JournalPlannedItemDto,
} from './dto/journal-day-response.dto';
import { FoodLogEntry } from './entities/food-log-entry.entity';
import {
  FoodLogEntryStatus,
  PlannedItemStatus,
} from './enums/food-log-entry-status.enum';

/** Display order of meal sections; every day always shows all five. */
export const MEAL_TYPE_ORDER: readonly NutritionMealType[] = [
  NutritionMealType.BREAKFAST,
  NutritionMealType.LUNCH,
  NutritionMealType.DINNER,
  NutritionMealType.SNACK,
  NutritionMealType.OTHER,
];

export const CORE_CODES = {
  calories: 'energy_kcal',
  protein: 'protein_g',
  carbohydrates: 'carbohydrates_g',
  fat: 'fat_g',
  fiber: 'fiber_g',
} as const;

/** Nutrient vector per 100 g from a plan item's snapshot (core nutrients only). */
export function planItemPer100(item: NutritionPlanMealItem): NutrientVector {
  return {
    [CORE_CODES.calories]: Number(item.caloriesPer100gSnapshot),
    [CORE_CODES.protein]: Number(item.proteinGPer100gSnapshot),
    [CORE_CODES.carbohydrates]: Number(item.carbohydratesGPer100gSnapshot),
    [CORE_CODES.fat]: Number(item.fatGPer100gSnapshot),
    [CORE_CODES.fiber]:
      item.fiberGPer100gSnapshot === null ||
      item.fiberGPer100gSnapshot === undefined
        ? null
        : Number(item.fiberGPer100gSnapshot),
  };
}

export function roundVector(vector: NutrientVector): NutrientVector {
  return Object.fromEntries(
    Object.entries(vector).map(([code, value]) => [
      code,
      value === null ? null : roundNutrient(value),
    ]),
  );
}

export function nutritionFromVector(
  vector: NutrientVector,
): JournalEntryNutritionDto {
  const pick = (code: string) => {
    const value = vector[code];
    return value === null || value === undefined ? null : roundNutrient(value);
  };
  return {
    caloriesKcal: pick(CORE_CODES.calories),
    proteinG: pick(CORE_CODES.protein),
    carbohydratesG: pick(CORE_CODES.carbohydrates),
    fatG: pick(CORE_CODES.fat),
    fiberG: pick(CORE_CODES.fiber),
  };
}

export function toJournalEntryDto(entry: FoodLogEntry): JournalEntryDto {
  const number = (value: number | null) =>
    value === null || value === undefined ? null : Number(value);
  return {
    id: entry.id,
    mealType: entry.mealType,
    status: entry.status,
    planItemId: entry.planItemId,
    foodId: entry.foodId,
    foodName: entry.foodNameSnapshot,
    brand: entry.brandSnapshot,
    grams: number(entry.grams),
    portionLabel: entry.portionLabel,
    portionQuantity: number(entry.portionQuantity),
    nutrition: {
      caloriesKcal: number(entry.caloriesKcal),
      proteinG: number(entry.proteinG),
      carbohydratesG: number(entry.carbohydratesG),
      fatG: number(entry.fatG),
      fiberG: number(entry.fiberG),
    },
    note: entry.note,
    loggedAt: entry.createdAt,
  };
}

function zeroMacros(): JournalMacrosDto {
  return {
    caloriesKcal: 0,
    proteinG: 0,
    carbohydratesG: 0,
    fatG: 0,
    fiberG: 0,
  };
}

function addMacros(
  total: JournalMacrosDto,
  nutrition: JournalEntryNutritionDto,
): JournalMacrosDto {
  return {
    caloriesKcal: roundNutrient(
      total.caloriesKcal + (nutrition.caloriesKcal ?? 0),
    ),
    proteinG: roundNutrient(total.proteinG + (nutrition.proteinG ?? 0)),
    carbohydratesG: roundNutrient(
      total.carbohydratesG + (nutrition.carbohydratesG ?? 0),
    ),
    fatG: roundNutrient(total.fatG + (nutrition.fatG ?? 0)),
    fiberG: roundNutrient(total.fiberG + (nutrition.fiberG ?? 0)),
  };
}

function numberOrNull(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** Sorted (meal position, item position) prescribed items of a plan. */
export function orderedPlanItems(plan: NutritionPlan): Array<{
  item: NutritionPlanMealItem;
  mealName: string;
  mealType: NutritionMealType;
}> {
  return [...(plan.meals ?? [])]
    .sort((left, right) => left.position - right.position)
    .flatMap((meal) =>
      [...(meal.items ?? [])]
        .sort((left, right) => left.position - right.position)
        .map((item) => ({
          item,
          mealName: meal.name,
          mealType: meal.mealType,
        })),
    );
}

export function buildJournalDay(input: {
  date: string;
  plan: NutritionPlan | null;
  entries: FoodLogEntry[];
  editable: boolean;
}): JournalDayResponseDto {
  const { date, plan, entries, editable } = input;
  const planItems = plan ? orderedPlanItems(plan) : [];
  const planItemIds = new Set(planItems.map(({ item }) => item.id));
  const entryByPlanItem = new Map(
    entries
      .filter((entry) => entry.planItemId && planItemIds.has(entry.planItemId))
      .map((entry) => [entry.planItemId as string, entry]),
  );

  const meals = new Map<NutritionMealType, JournalMealDto>(
    MEAL_TYPE_ORDER.map((mealType) => [
      mealType,
      {
        mealType,
        plannedItems: [],
        extraEntries: [],
        plannedCaloriesKcal: 0,
        consumedCaloriesKcal: 0,
      },
    ]),
  );
  const adherence = {
    plannedItems: 0,
    eaten: 0,
    replaced: 0,
    skipped: 0,
    pending: 0,
  };
  let planned = zeroMacros();
  let consumed = zeroMacros();

  for (const { item, mealName, mealType } of planItems) {
    const nutrition = nutritionFromVector(
      scalePer100(planItemPer100(item), Number(item.quantityGrams)),
    );
    const entry = entryByPlanItem.get(item.id) ?? null;
    let status = PlannedItemStatus.PENDING;
    if (entry?.status === FoodLogEntryStatus.SKIPPED) {
      status = PlannedItemStatus.SKIPPED;
    } else if (entry) {
      status =
        entry.foodId === item.sourceFoodId
          ? PlannedItemStatus.EATEN
          : PlannedItemStatus.REPLACED;
    }

    const dto: JournalPlannedItemDto = {
      planItemId: item.id,
      planMealName: mealName,
      foodId: item.sourceFoodId,
      foodName: item.foodNameSnapshot,
      brand: item.brandSnapshot,
      quantityGrams: Number(item.quantityGrams),
      nutrition,
      status,
      entry: entry ? toJournalEntryDto(entry) : null,
    };
    const meal = meals.get(mealType)!;
    meal.plannedItems.push(dto);
    meal.plannedCaloriesKcal = roundNutrient(
      meal.plannedCaloriesKcal + (nutrition.caloriesKcal ?? 0),
    );
    planned = addMacros(planned, nutrition);

    adherence.plannedItems += 1;
    if (status === PlannedItemStatus.EATEN) adherence.eaten += 1;
    else if (status === PlannedItemStatus.REPLACED) adherence.replaced += 1;
    else if (status === PlannedItemStatus.SKIPPED) adherence.skipped += 1;
    else adherence.pending += 1;
  }

  for (const entry of entries) {
    const linked =
      entry.planItemId !== null && planItemIds.has(entry.planItemId);
    if (entry.status === FoodLogEntryStatus.EATEN) {
      const nutrition = toJournalEntryDto(entry).nutrition;
      consumed = addMacros(consumed, nutrition);
      const meal = meals.get(entry.mealType)!;
      meal.consumedCaloriesKcal = roundNutrient(
        meal.consumedCaloriesKcal + (nutrition.caloriesKcal ?? 0),
      );
      if (!linked) {
        meal.extraEntries.push(toJournalEntryDto(entry));
      }
    }
    // A SKIPPED entry whose plan item no longer exists is history only.
  }

  const targets = {
    caloriesKcal: numberOrNull(plan?.targetCaloriesKcal),
    proteinG: numberOrNull(plan?.targetProteinG),
    carbohydratesG: numberOrNull(plan?.targetCarbohydratesG),
    fatG: numberOrNull(plan?.targetFatG),
  };

  return {
    date,
    plan: plan ? { id: plan.id, name: plan.name } : null,
    targets,
    planned,
    consumed,
    remainingCaloriesKcal:
      targets.caloriesKcal === null
        ? null
        : roundNutrient(targets.caloriesKcal - consumed.caloriesKcal),
    adherence,
    meals: MEAL_TYPE_ORDER.map((mealType) => meals.get(mealType)!),
    editable,
  };
}

/** Sum of per-code snapshots; used by tests and analytics. */
export function sumSnapshots(snapshots: NutrientVector[]): NutrientVector {
  return roundVector(sumVectors(snapshots).totals);
}
