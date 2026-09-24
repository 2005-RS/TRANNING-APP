import { toIsoDateString } from '../clients/iso-date.util';
import {
  NutritionPlanMealItemResponseDto,
  NutritionPlanMealResponseDto,
  NutritionPlanResponseDto,
  NutritionPlanSummaryResponseDto,
  NutritionTargetDifferencesDto,
  NutritionTotalsDto,
} from './dto/nutrition-plan-response.dto';
import { NutritionPlanMealItem } from './entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from './entities/nutrition-plan-meal.entity';
import { NutritionPlan } from './entities/nutrition-plan.entity';
import {
  roundNutrition,
  scaleNullablePer100,
  scalePer100,
  sumNutrition,
} from './nutrition-calc.util';

function toNumberOrNull(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

export function toNutritionPlanSummary(
  plan: NutritionPlan,
): NutritionPlanSummaryResponseDto {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    startDate: toIsoDateString(plan.startDate),
    endDate: toIsoDateString(plan.endDate),
    targets: {
      caloriesKcal: toNumberOrNull(plan.targetCaloriesKcal),
      proteinG: toNumberOrNull(plan.targetProteinG),
      carbohydratesG: toNumberOrNull(plan.targetCarbohydratesG),
      fatG: toNumberOrNull(plan.targetFatG),
    },
    clientProfileId: plan.clientProfileId,
    createdByUserId: plan.createdByUserId,
    activatedAt: plan.activatedAt,
    archivedAt: plan.archivedAt,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export function toItemNutrition(item: NutritionPlanMealItem): {
  caloriesKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number | null;
} {
  const quantity = Number(item.quantityGrams);
  return {
    caloriesKcal: scalePer100(Number(item.caloriesPer100gSnapshot), quantity),
    proteinG: scalePer100(Number(item.proteinGPer100gSnapshot), quantity),
    carbohydratesG: scalePer100(
      Number(item.carbohydratesGPer100gSnapshot),
      quantity,
    ),
    fatG: scalePer100(Number(item.fatGPer100gSnapshot), quantity),
    fiberG: scaleNullablePer100(
      item.fiberGPer100gSnapshot === null ||
        item.fiberGPer100gSnapshot === undefined
        ? null
        : Number(item.fiberGPer100gSnapshot),
      quantity,
    ),
  };
}

function toMealItemResponse(
  item: NutritionPlanMealItem,
): NutritionPlanMealItemResponseDto {
  return {
    id: item.id,
    foodId: item.sourceFoodId,
    foodName: item.foodNameSnapshot,
    brand: item.brandSnapshot,
    quantityGrams: Number(item.quantityGrams),
    nutrition: toItemNutrition(item),
    position: item.position,
    notes: item.notes,
  };
}

function toMealTotals(
  items: NutritionPlanMealItemResponseDto[],
): NutritionTotalsDto {
  return {
    caloriesKcal: sumNutrition(
      items.map((item) => item.nutrition.caloriesKcal),
    ),
    proteinG: sumNutrition(items.map((item) => item.nutrition.proteinG)),
    carbohydratesG: sumNutrition(
      items.map((item) => item.nutrition.carbohydratesG),
    ),
    fatG: sumNutrition(items.map((item) => item.nutrition.fatG)),
    fiberG: sumNutrition(items.map((item) => item.nutrition.fiberG ?? 0)),
  };
}

function difference(mealTotal: number, target: number | null): number | null {
  if (target === null) {
    return null;
  }
  return roundNutrition(mealTotal - target);
}

export function toTargetDifferences(
  mealPlanTotals: NutritionTotalsDto,
  targets: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbohydratesG: number | null;
    fatG: number | null;
  },
): NutritionTargetDifferencesDto {
  return {
    caloriesDifferenceKcal: difference(
      mealPlanTotals.caloriesKcal,
      targets.caloriesKcal,
    ),
    proteinDifferenceG: difference(mealPlanTotals.proteinG, targets.proteinG),
    carbohydratesDifferenceG: difference(
      mealPlanTotals.carbohydratesG,
      targets.carbohydratesG,
    ),
    fatDifferenceG: difference(mealPlanTotals.fatG, targets.fatG),
  };
}

export function toNutritionPlanResponse(
  plan: NutritionPlan,
  meals: NutritionPlanMeal[] = plan.meals ?? [],
): NutritionPlanResponseDto {
  const orderedMeals = [...meals]
    .sort((left, right) => left.position - right.position)
    .map((meal) => toMealResponse(meal));

  const mealPlanTotals: NutritionTotalsDto = {
    caloriesKcal: sumNutrition(
      orderedMeals.map((meal) => meal.totals.caloriesKcal),
    ),
    proteinG: sumNutrition(orderedMeals.map((meal) => meal.totals.proteinG)),
    carbohydratesG: sumNutrition(
      orderedMeals.map((meal) => meal.totals.carbohydratesG),
    ),
    fatG: sumNutrition(orderedMeals.map((meal) => meal.totals.fatG)),
    fiberG: sumNutrition(orderedMeals.map((meal) => meal.totals.fiberG)),
  };

  const summary = toNutritionPlanSummary(plan);

  return {
    ...summary,
    mealPlanTotals,
    targetDifferences: toTargetDifferences(mealPlanTotals, summary.targets),
    meals: orderedMeals,
  };
}

function toMealResponse(meal: NutritionPlanMeal): NutritionPlanMealResponseDto {
  const items = [...(meal.items ?? [])]
    .sort((left, right) => left.position - right.position)
    .map((item) => toMealItemResponse(item));

  return {
    id: meal.id,
    name: meal.name,
    mealType: meal.mealType,
    position: meal.position,
    notes: meal.notes,
    totals: toMealTotals(items),
    items,
  };
}
