import { useClientNutritionPlansGetCurrent } from '@/generated/client-nutrition-plans/client-nutrition-plans';
import { CLIENT_NUTRITION_STALE_TIME_MS } from '@/features/client-nutrition/lib/query-policy';

export function useCurrentNutritionPlan() {
  return useClientNutritionPlansGetCurrent({
    query: {
      staleTime: CLIENT_NUTRITION_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });
}
