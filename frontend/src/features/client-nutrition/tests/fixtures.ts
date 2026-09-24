import type {
  CurrentNutritionPlanResponseDto,
  NutritionPlanResponseDto,
} from '@/generated/models';
import { NutritionPlanResponseDtoStatus } from '@/generated/models';
import { NutritionPlanMealResponseDtoMealType } from '@/generated/models';

const PLAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const totalsZero = {
  caloriesKcal: 0,
  proteinG: 0,
  carbohydratesG: 0,
  fatG: 0,
  fiberG: 0,
};

export const emptyCurrentPlan: CurrentNutritionPlanResponseDto = {
  nutritionPlan: null,
};

export const populatedNutritionPlan: NutritionPlanResponseDto = {
  id: PLAN_ID,
  name: 'Performance meals',
  description: 'Weekday eating for the hypertrophy block.',
  status: NutritionPlanResponseDtoStatus.ACTIVE,
  startDate: '2026-09-01',
  endDate: null,
  targets: {
    caloriesKcal: 2450,
    proteinG: 180,
    carbohydratesG: 260,
    fatG: 70,
  },
  clientProfileId: '11111111-cccc-4111-8111-111111111111',
  createdByUserId: '22222222-tttt-4111-8111-222222222222',
  activatedAt: '2026-09-01T08:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  mealPlanTotals: {
    caloriesKcal: 2380.5,
    proteinG: 178,
    carbohydratesG: 246,
    fatG: 68,
    fiberG: 32,
  },
  targetDifferences: {
    caloriesDifferenceKcal: -69.5,
    proteinDifferenceG: -2,
    carbohydratesDifferenceG: -14,
    fatDifferenceG: -2,
  },
  meals: [
    {
      id: 'm1111111-aaaa-4111-8111-m11111111111',
      name: 'Morning plate',
      mealType: NutritionPlanMealResponseDtoMealType.BREAKFAST,
      position: 1,
      notes: null,
      totals: {
        caloriesKcal: 620,
        proteinG: 42,
        carbohydratesG: 68,
        fatG: 18,
        fiberG: 8,
      },
      items: [
        {
          id: 'i1111111-aaaa-4111-8111-i11111111111',
          foodId: 'f1111111-ffff-4111-8111-f11111111111',
          foodName: 'Greek yogurt',
          brand: 'Local dairy',
          quantityGrams: 150.5,
          nutrition: {
            caloriesKcal: 145,
            proteinG: 16,
            carbohydratesG: 8,
            fatG: 4.5,
            fiberG: 0,
          },
          position: 1,
          notes: null,
        },
        {
          id: 'i2222222-aaaa-4111-8111-i22222222222',
          foodId: 'f2222222-ffff-4111-8111-f22222222222',
          foodName: 'Oats',
          brand: null,
          quantityGrams: 62.5,
          nutrition: {
            caloriesKcal: 240,
            proteinG: 8,
            carbohydratesG: 40,
            fatG: 4,
            fiberG: 6,
          },
          position: 2,
          notes: 'Dry weight',
        },
      ],
    },
    {
      id: 'm2222222-aaaa-4111-8111-m22222222222',
      name: 'Training lunch',
      mealType: NutritionPlanMealResponseDtoMealType.LUNCH,
      position: 2,
      notes: 'After the midday session when possible.',
      totals: {
        caloriesKcal: 780,
        proteinG: 55,
        carbohydratesG: 90,
        fatG: 20,
        fiberG: 10,
      },
      items: [
        {
          id: 'i3333333-aaaa-4111-8111-i33333333333',
          foodId: 'f3333333-ffff-4111-8111-f33333333333',
          foodName: 'Chicken breast',
          brand: null,
          quantityGrams: 180,
          nutrition: {
            caloriesKcal: 300,
            proteinG: 55,
            carbohydratesG: 0,
            fatG: 6,
            fiberG: null,
          },
          position: 1,
          notes: null,
        },
      ],
    },
    {
      id: 'm3333333-aaaa-4111-8111-m33333333333',
      name: 'Evening',
      mealType: NutritionPlanMealResponseDtoMealType.DINNER,
      position: 3,
      notes: null,
      totals: {
        caloriesKcal: 0,
        proteinG: 0,
        carbohydratesG: 0,
        fatG: 0,
        fiberG: 0,
      },
      items: [],
    },
  ],
};

export const populatedCurrentPlan: CurrentNutritionPlanResponseDto = {
  nutritionPlan: populatedNutritionPlan,
};

export const partialTargetsPlan: NutritionPlanResponseDto = {
  ...populatedNutritionPlan,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  name: 'Protein-only targets',
  description: null,
  startDate: null,
  endDate: null,
  targets: {
    caloriesKcal: null,
    proteinG: 160,
    carbohydratesG: null,
    fatG: null,
  },
  mealPlanTotals: totalsZero,
  targetDifferences: {
    caloriesDifferenceKcal: null,
    proteinDifferenceG: 0,
    carbohydratesDifferenceG: null,
    fatDifferenceG: null,
  },
  meals: [
    {
      id: 'm4444444-aaaa-4111-8111-m44444444444',
      name: 'Snack window',
      mealType: NutritionPlanMealResponseDtoMealType.SNACK,
      position: 1,
      notes: null,
      totals: totalsZero,
      items: [],
    },
  ],
};

export const zeroTargetsPlan: NutritionPlanResponseDto = {
  ...populatedNutritionPlan,
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  name: 'Zeroed targets',
  targets: {
    caloriesKcal: 0,
    proteinG: 0,
    carbohydratesG: 0,
    fatG: 0,
  },
  mealPlanTotals: totalsZero,
  targetDifferences: {
    caloriesDifferenceKcal: 0,
    proteinDifferenceG: 0,
    carbohydratesDifferenceG: 0,
    fatDifferenceG: 0,
  },
  meals: [],
};
