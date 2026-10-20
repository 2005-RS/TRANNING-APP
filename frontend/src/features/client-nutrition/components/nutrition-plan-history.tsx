import { Link } from '@tanstack/react-router';
import { useClientNutritionPlansListMine } from '@/generated/client-nutrition-plans/client-nutrition-plans';
import { ClientNutritionPlansListMineStatus } from '@/generated/models';
import { formatPlanDateRange } from '@/features/client-dashboard/lib/formatters';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';

/** The client's previous (archived) nutrition plans, newest first, as links to a read-only view. */
export function NutritionPlanHistory() {
  const query = useClientNutritionPlansListMine({
    status: ClientNutritionPlansListMineStatus.ARCHIVED,
    limit: 20,
  });

  if (query.isPending || query.isError) {
    // The current plan stays the focus of the page; history is secondary and hides on failure.
    return null;
  }

  const plans = query.data?.data ?? [];

  return (
    <section className="space-y-3" aria-labelledby="nutrition-previous-plans">
      <h2 id="nutrition-previous-plans" className="text-lg font-semibold tracking-tight">
        {clientNutritionCopy.previousPlans}
      </h2>
      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">{clientNutritionCopy.previousPlansEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => {
            const dates = formatPlanDateRange(plan.startDate, plan.endDate);
            return (
              <li key={plan.id} className="client-surface-card">
                <Link
                  to="/client/nutrition/plans/$planId"
                  params={{ planId: plan.id }}
                  className="block min-h-11"
                >
                  <p className="font-semibold">{plan.name}</p>
                  {dates ? <p className="text-sm text-muted-foreground">{dates}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
