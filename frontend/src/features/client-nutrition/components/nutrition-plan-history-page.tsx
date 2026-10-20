import { useParams } from '@tanstack/react-router';
import { useClientNutritionPlansGetMineById } from '@/generated/client-nutrition-plans/client-nutrition-plans';
import { DailyTargets } from '@/features/client-nutrition/components/daily-targets';
import { MealDayBoard } from '@/features/client-nutrition/components/meal-day-board';
import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { PlanHero } from '@/features/client-nutrition/components/plan-hero';
import { PlanTotals } from '@/features/client-nutrition/components/plan-totals';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { sortedMeals } from '@/features/client-nutrition/lib/plan-helpers';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { Spinner } from '@/shared/ui/spinner';

/** Read-only view of one of the client's previous (archived) nutrition plans. */
export function NutritionPlanHistoryPage() {
  const { planId } = useParams({ from: '/client/nutrition/plans/$planId' });
  const query = useClientNutritionPlansGetMineById(planId);
  const plan = query.data;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{plan?.name ?? clientNutritionCopy.previousPlanDetails}</PageTitle>
          <PageDescription>{clientNutritionCopy.previousPlanDetails}</PageDescription>
        </div>
      </PageHeader>

      {query.isPending ? (
        <div className="flex justify-center py-12" role="status" aria-label={clientNutritionCopy.previousPlanDetails}>
          <Spinner />
        </div>
      ) : null}

      {query.isError ? (
        <NutritionError
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {plan ? (
        <div className="space-y-5">
          <PlanHero plan={plan} />
          <DailyTargets plan={plan} />
          <MealDayBoard meals={sortedMeals(plan)} />
          <PlanTotals plan={plan} />
        </div>
      ) : null}
    </PageContainer>
  );
}
