import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const clientNutritionCopySource = {
  title: 'Nutrition',
  description: 'Your current assigned plan. These are prescribed targets, not food you have eaten.',
  loadingLabel: 'Loading nutrition plan',
  emptyTitle: 'No nutrition plan is assigned yet.',
  emptyBody: 'Your coach will assign a plan. Meals and daily targets will appear here.',
  prescribedHint: 'This is a prescribed plan, not a log of what you ate.',
  plan: {
    eyebrow: 'Current plan',
    statusActive: 'Active',
    statusArchived: 'Archived',
    statusDraft: 'Draft',
    from: 'From',
    until: 'Until',
  },
  targets: {
    title: 'Daily targets',
    description: 'Prescribed amounts for this plan. Not calories remaining or consumed.',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    none: 'No daily targets are set on this plan.',
    macroChart: 'Share of prescribed protein, carbohydrate, and fat targets',
  },
  totals: {
    title: 'Plan information',
    dailyTarget: 'Daily target',
    mealTotal: 'Planned meal total',
    difference: 'Difference',
    differenceHint:
      'Planned meal total minus the daily target. This is not remaining calories or intake.',
    meals: 'Meals',
    meal: 'Meal',
    comparison: 'Planned nutrients vs daily targets',
    planned: 'Planned',
    target: 'Target',
    noTarget: 'No target set',
    savedHint: 'Values from the saved meal plan. Differences are planned amounts minus targets.',
  },
  meals: {
    title: 'Meals',
    description: 'Foods and portions in the assigned plan.',
    empty: 'No meals are listed on this plan yet.',
    noFoods: 'No foods listed.',
    notes: 'Notes',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    fiber: 'Fiber',
  },
  foods: {
    quantity: 'Amount',
  },
  mealType: {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner',
    SNACK: 'Snack',
    OTHER: 'Other',
  },
  error: {
    retry: 'Try again',
    retrying: 'Trying again…',
    network: 'The nutrition plan could not be loaded. Check your connection and try again.',
  },
} as const;

registerEnglishNamespace('clientNutrition', clientNutritionCopySource);
export const clientNutritionCopy = createLiveCopy<typeof clientNutritionCopySource>('clientNutrition');

export function useClientNutritionCopy() {
  return useLiveCopy<typeof clientNutritionCopySource>('clientNutrition');
}
