import { Utensils } from 'lucide-react';
import type { NutritionPlanResponseDto } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import {
  formatKcal,
  formatMealCount,
  formatSignedKcal,
} from '@/features/client-nutrition/lib/formatters';

export function PlanTotals({ plan }: { plan: NutritionPlanResponseDto }) {
  const daily = formatKcal(plan.targets.caloriesKcal ?? null);
  const mealTotal = formatKcal(plan.mealPlanTotals.caloriesKcal);
  const difference = formatSignedKcal(plan.targetDifferences.caloriesDifferenceKcal ?? null);
  const meals = formatMealCount(
    plan.meals.length,
    clientNutritionCopy.totals.meal,
    clientNutritionCopy.totals.meals,
  );

  return (
    <section className="client-surface-card space-y-4" aria-labelledby="nutrition-info-heading">
      <div className="flex items-start gap-3">
        <Utensils className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 id="nutrition-info-heading" className="text-lg font-semibold tracking-tight">
            {clientNutritionCopy.totals.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{meals}</p>
        </div>
      </div>
      <dl className="space-y-2 text-sm">
        {daily ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{clientNutritionCopy.totals.dailyTarget}</dt>
            <dd className="text-numeric font-medium text-foreground">{daily}</dd>
          </div>
        ) : null}
        {mealTotal ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{clientNutritionCopy.totals.mealTotal}</dt>
            <dd className="text-numeric font-medium text-foreground">{mealTotal}</dd>
          </div>
        ) : null}
        {difference && daily ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{clientNutritionCopy.totals.difference}</dt>
            <dd className="text-numeric font-medium text-foreground">{difference}</dd>
          </div>
        ) : null}
      </dl>
      {daily && mealTotal ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clientNutritionCopy.totals.differenceHint}
        </p>
      ) : null}
    </section>
  );
}
