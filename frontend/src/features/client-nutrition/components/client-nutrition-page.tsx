import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { NutritionSkeleton } from '@/features/client-nutrition/components/nutrition-skeleton';
import { DailyTargets } from '@/features/client-nutrition/components/daily-targets';
import { MealCard } from '@/features/client-nutrition/components/meal-list';
import { PlanHero } from '@/features/client-nutrition/components/plan-hero';
import { PlanTotals } from '@/features/client-nutrition/components/plan-totals';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { useCurrentNutritionPlan } from '@/features/client-nutrition/hooks/use-current-nutrition-plan';
import { sortedMeals } from '@/features/client-nutrition/lib/plan-helpers';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

export function ClientNutritionPage() {
  const query = useCurrentNutritionPlan();
  const plan = query.data?.nutritionPlan ?? null;
  const meals = plan ? sortedMeals(plan) : [];

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{clientNutritionCopy.title}</PageTitle>
          <PageDescription>{clientNutritionCopy.description}</PageDescription>
        </div>
      </PageHeader>

      {query.isPending ? (
        <NutritionSkeleton />
      ) : query.isError ? (
        <NutritionError
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      ) : plan ? (
        <div className="space-y-5">
          <PlanHero plan={plan} />
          <DailyTargets targets={plan.targets} />
          <section className="space-y-3" aria-labelledby="nutrition-meals-heading">
            <div className="px-1">
              <h2 id="nutrition-meals-heading" className="text-lg font-semibold tracking-tight">
                {clientNutritionCopy.meals.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {clientNutritionCopy.meals.description}
              </p>
            </div>
            {meals.length > 0 ? (
              meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            ) : (
              <section className="client-surface-card">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {clientNutritionCopy.meals.empty}
                </p>
              </section>
            )}
          </section>
          <PlanTotals plan={plan} />
        </div>
      ) : (
        <section className="client-surface-card space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {clientNutritionCopy.emptyTitle}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {clientNutritionCopy.emptyBody}
          </p>
        </section>
      )}
    </PageContainer>
  );
}
