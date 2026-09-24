import { Link } from '@tanstack/react-router';
import { Utensils } from 'lucide-react';
import type { ClientDashboardNutritionPlanDto } from '@/generated/models';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  formatCountLabel,
  formatKcal,
} from '@/features/client-dashboard/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

export function NutritionSummaryCard({
  nutritionPlan,
}: {
  nutritionPlan: ClientDashboardNutritionPlanDto;
}) {
  const meals = formatCountLabel(
    nutritionPlan.mealCount,
    clientDashboardCopy.nutrition.meal,
    clientDashboardCopy.nutrition.meals,
  );
  const target =
    nutritionPlan.targetCaloriesKcal != null
      ? formatKcal(nutritionPlan.targetCaloriesKcal)
      : null;
  const planTotal = formatKcal(nutritionPlan.mealPlanTotals.caloriesKcal);

  return (
    <DashboardCard aria-labelledby="nutrition-summary-heading">
      <div className="flex items-start gap-2.5">
        <Utensils className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <h2
            id="nutrition-summary-heading"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {clientDashboardCopy.nutrition.title}
          </h2>
          <p className="mt-1 text-base font-medium text-foreground">{nutritionPlan.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{meals}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {target ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {clientDashboardCopy.nutrition.targetCalories}
            </dt>
            <dd className="text-numeric text-foreground">{target}</dd>
          </div>
        ) : null}
        {planTotal ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {clientDashboardCopy.nutrition.planCalories}
            </dt>
            <dd className="text-numeric text-foreground">{planTotal}</dd>
          </div>
        ) : null}
      </dl>

      <Link
        to="/client/nutrition"
        className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 min-h-12 w-full')}
      >
        {clientDashboardCopy.nutrition.viewNutrition}
      </Link>
    </DashboardCard>
  );
}
