import { http, HttpResponse } from 'msw';
import type {
  JournalDayResponseDto,
  JournalPlannedItemDto,
  NutritionFoodResponseDto,
  PaginatedClientFoodsResponseDto,
} from '@/generated/models';

const API = 'http://localhost:3000/api/v1/clients/me';

export const OATS_ITEM_ID = '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a';
export const CHICKEN_ITEM_ID = '0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b';
export const OATS_FOOD_ID = '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a';
export const CHICKEN_FOOD_ID = '1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b';
export const EGG_PORTION_ID = '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a';

function planned(
  planItemId: string,
  foodId: string,
  foodName: string,
  quantityGrams: number,
  caloriesKcal: number,
): JournalPlannedItemDto {
  return {
    planItemId,
    planMealName: foodName,
    foodId,
    foodName,
    brand: null,
    quantityGrams,
    nutrition: { caloriesKcal, proteinG: 10, carbohydratesG: 20, fatG: 5, fiberG: null },
    status: 'PENDING',
    entry: null,
  };
}

export function journalDay(date: string): JournalDayResponseDto {
  return {
    date,
    plan: { id: 'plan-1', name: 'Cut plan' },
    targets: { caloriesKcal: 2000, proteinG: 150, carbohydratesG: 200, fatG: 60 },
    planned: { caloriesKcal: 558.7, proteinG: 20, carbohydratesG: 40, fatG: 10, fiberG: 0 },
    consumed: { caloriesKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0 },
    remainingCaloriesKcal: 2000,
    adherence: { plannedItems: 2, eaten: 0, replaced: 0, skipped: 0, pending: 2 },
    editable: true,
    meals: [
      {
        mealType: 'BREAKFAST',
        plannedItems: [planned(OATS_ITEM_ID, OATS_FOOD_ID, 'Oats', 80, 311.2)],
        extraEntries: [],
        plannedCaloriesKcal: 311.2,
        consumedCaloriesKcal: 0,
      },
      {
        mealType: 'LUNCH',
        plannedItems: [planned(CHICKEN_ITEM_ID, CHICKEN_FOOD_ID, 'Chicken breast', 150, 247.5)],
        extraEntries: [],
        plannedCaloriesKcal: 247.5,
        consumedCaloriesKcal: 0,
      },
      { mealType: 'DINNER', plannedItems: [], extraEntries: [], plannedCaloriesKcal: 0, consumedCaloriesKcal: 0 },
      { mealType: 'SNACK', plannedItems: [], extraEntries: [], plannedCaloriesKcal: 0, consumedCaloriesKcal: 0 },
      { mealType: 'OTHER', plannedItems: [], extraEntries: [], plannedCaloriesKcal: 0, consumedCaloriesKcal: 0 },
    ],
  };
}

export const eggFood: NutritionFoodResponseDto = {
  id: '3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a',
  name: 'Huevo entero',
  brand: null,
  description: null,
  source: 'USDA_FDC',
  externalId: '748967',
  sourceDataType: 'Foundation',
  importedAt: '2026-09-30T00:00:00.000Z',
  nameOriginal: 'Egg, whole, raw, fresh',
  nameOrigin: 'HUMAN_TRANSLATED',
  nameVerifiedAt: null,
  nutritionPer100g: { caloriesKcal: 143, proteinG: 12.6, carbohydratesG: 0.7, fatG: 9.5, fiberG: 0 },
  nutrients: [
    { code: 'energy_kcal', nameEn: 'Energy', nameEs: 'Energía', unit: 'kcal', category: 'ENERGY', amountPer100g: 143, derivation: 'MEASURED', source: 'USDA_FDC' },
    { code: 'protein_g', nameEn: 'Protein', nameEs: 'Proteína', unit: 'g', category: 'MACRO', amountPer100g: 12.6, derivation: 'MEASURED', source: 'USDA_FDC' },
    { code: 'carbohydrates_g', nameEn: 'Carbohydrates', nameEs: 'Carbohidratos', unit: 'g', category: 'MACRO', amountPer100g: 0.7, derivation: 'MEASURED', source: 'USDA_FDC' },
    { code: 'fat_g', nameEn: 'Total fat', nameEs: 'Grasas totales', unit: 'g', category: 'MACRO', amountPer100g: 9.5, derivation: 'MEASURED', source: 'USDA_FDC' },
    { code: 'sodium_mg', nameEn: 'Sodium', nameEs: 'Sodio', unit: 'mg', category: 'MINERAL', amountPer100g: 142, derivation: 'MEASURED', source: 'USDA_FDC' },
    { code: 'vitamin_d_ug', nameEn: 'Vitamin D', nameEs: 'Vitamina D', unit: 'ug', category: 'VITAMIN', amountPer100g: null, derivation: 'MEASURED', source: 'USDA_FDC' },
  ],
  portions: [{ id: EGG_PORTION_ID, label: '1 egg', gramWeight: 50, isDefault: true }],
  status: 'ACTIVE',
  visibility: 'GLOBAL',
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
};

const eggSearch: PaginatedClientFoodsResponseDto = {
  data: [
    {
      id: eggFood.id,
      name: eggFood.name,
      brand: null,
      source: 'USDA_FDC',
      visibility: 'GLOBAL',
      isOwn: false,
      inPlan: false,
      nutritionPer100g: eggFood.nutritionPer100g,
      defaultPortion: { id: EGG_PORTION_ID, label: '1 egg', gramWeight: 50, caloriesKcal: 71.5 },
    },
  ],
  meta: { page: 1, limit: 30, totalItems: 1, totalPages: 1 },
};

type JournalMockState = {
  day: JournalDayResponseDto | null;
  lastEntryBody: unknown;
  lastPlannedAction: string | null;
  barcodeStatus: number;
};

export const journalMockState: JournalMockState = {
  day: null,
  lastEntryBody: null,
  lastPlannedAction: null,
  barcodeStatus: 200,
};

export function resetJournalMockState(): void {
  journalMockState.day = null;
  journalMockState.lastEntryBody = null;
  journalMockState.lastPlannedAction = null;
  journalMockState.barcodeStatus = 200;
}

function currentDay(date: string): JournalDayResponseDto {
  journalMockState.day ??= journalDay(date);
  return { ...journalMockState.day, date };
}

function resolvePlanned(date: string, planItemId: string, status: 'EATEN' | 'SKIPPED' | 'PENDING') {
  const day = currentDay(date);
  const meals = day.meals.map((meal) => ({
    ...meal,
    plannedItems: meal.plannedItems.map((item) =>
      item.planItemId === planItemId ? { ...item, status } : item,
    ),
  }));
  const eatenCalories = meals
    .flatMap((meal) => meal.plannedItems)
    .filter((item) => item.status === 'EATEN')
    .reduce((sum, item) => sum + (item.nutrition.caloriesKcal ?? 0), 0);
  const items = meals.flatMap((meal) => meal.plannedItems);
  journalMockState.day = {
    ...day,
    meals,
    consumed: { ...day.consumed, caloriesKcal: eatenCalories },
    remainingCaloriesKcal: 2000 - eatenCalories,
    adherence: {
      plannedItems: items.length,
      eaten: items.filter((item) => item.status === 'EATEN').length,
      replaced: 0,
      skipped: items.filter((item) => item.status === 'SKIPPED').length,
      pending: items.filter((item) => item.status === 'PENDING').length,
    },
  };
  return journalMockState.day;
}

export const journalHandlers = [
  http.get(`${API}/nutrition-journal/days/:date`, ({ params }) =>
    HttpResponse.json(currentDay(String(params.date))),
  ),
  http.post(`${API}/nutrition-journal/days/:date/plan-items/:planItemId/eaten`, ({ params }) => {
    journalMockState.lastPlannedAction = `eaten:${String(params.planItemId)}`;
    return HttpResponse.json(resolvePlanned(String(params.date), String(params.planItemId), 'EATEN'));
  }),
  http.post(`${API}/nutrition-journal/days/:date/plan-items/:planItemId/skip`, ({ params }) => {
    journalMockState.lastPlannedAction = `skip:${String(params.planItemId)}`;
    return HttpResponse.json(resolvePlanned(String(params.date), String(params.planItemId), 'SKIPPED'));
  }),
  http.delete(`${API}/nutrition-journal/days/:date/plan-items/:planItemId`, ({ params }) =>
    HttpResponse.json(resolvePlanned(String(params.date), String(params.planItemId), 'PENDING')),
  ),
  http.post(`${API}/nutrition-journal/days/:date/entries`, async ({ request }) => {
    journalMockState.lastEntryBody = await request.json();
    return HttpResponse.json(
      {
        id: '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a',
        mealType: 'SNACK',
        status: 'EATEN',
        planItemId: null,
        foodId: eggFood.id,
        foodName: eggFood.name,
        brand: null,
        grams: 100,
        portionLabel: '1 egg',
        portionQuantity: 2,
        nutrition: { caloriesKcal: 143, proteinG: 12.6, carbohydratesG: 0.7, fatG: 9.5, fiberG: 0 },
        note: null,
        loggedAt: '2026-09-30T10:00:00.000Z',
      },
      { status: 201 },
    );
  }),
  http.get(`${API}/nutrition-foods`, () => HttpResponse.json(eggSearch)),
  http.get(`${API}/nutrition-foods/barcode/:barcode`, () =>
    journalMockState.barcodeStatus === 200
      ? HttpResponse.json(eggFood)
      : HttpResponse.json(
          {
            statusCode: journalMockState.barcodeStatus,
            code: 'NOT_FOUND',
            message: 'Product not found',
            path: '/api/v1/clients/me/nutrition-foods/barcode',
            timestamp: '2026-09-30T00:00:00.000Z',
            requestId: 'req-barcode',
          },
          { status: journalMockState.barcodeStatus },
        ),
  ),
  http.get(`${API}/nutrition-foods/:foodId`, () => HttpResponse.json(eggFood)),
  // Trainer read-only view (registered after the /clients/me handlers above).
  http.get(
    'http://localhost:3000/api/v1/clients/:clientId/nutrition-journal/days/:date',
    ({ params }) => HttpResponse.json({ ...journalDay(String(params.date)), editable: false }),
  ),
];
