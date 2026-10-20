import { delay, http, HttpResponse } from 'msw';
import { emptyCurrentPlan } from '@/features/client-nutrition/tests/fixtures';
import type { CurrentNutritionPlanResponseDto, NutritionPlanResponseDto } from '@/generated/models';

const API = 'http://localhost:3000/api/v1/clients/me/nutrition-plans/current';
const PLANS_API = 'http://localhost:3000/api/v1/clients/me/nutrition-plans';

type NutritionMockState = {
  current: CurrentNutritionPlanResponseDto;
  status: number;
  delayMs: number;
  failNetwork: boolean;
  /** Archived plans for "Planes anteriores" (empty by default). */
  archivedPlans: NutritionPlanResponseDto[];
};

export const nutritionMockState: NutritionMockState = {
  current: emptyCurrentPlan,
  status: 200,
  delayMs: 0,
  failNetwork: false,
  archivedPlans: [],
};

export function resetNutritionMockState(): void {
  nutritionMockState.current = emptyCurrentPlan;
  nutritionMockState.status = 200;
  nutritionMockState.delayMs = 0;
  nutritionMockState.failNetwork = false;
  nutritionMockState.archivedPlans = [];
}

export const nutritionHandlers = [
  http.get(PLANS_API, () =>
    HttpResponse.json({
      data: nutritionMockState.archivedPlans,
      meta: {
        page: 1,
        limit: 20,
        totalItems: nutritionMockState.archivedPlans.length,
        totalPages: nutritionMockState.archivedPlans.length ? 1 : 0,
      },
    }),
  ),
  http.get(API, async () => {
    if (nutritionMockState.delayMs > 0) {
      await delay(nutritionMockState.delayMs);
    }
    if (nutritionMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (nutritionMockState.status >= 400) {
      return HttpResponse.json(
        {
          statusCode: nutritionMockState.status,
          code: nutritionMockState.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
          message: 'Nutrition plan failed',
          path: '/api/v1/clients/me/nutrition-plans/current',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'req-nutrition',
        },
        { status: nutritionMockState.status },
      );
    }
    return HttpResponse.json(nutritionMockState.current);
  }),
  http.get(`${PLANS_API}/:planId`, ({ params }) => {
    const plan = nutritionMockState.archivedPlans.find((item) => item.id === params.planId);
    return plan ? HttpResponse.json(plan) : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
];
