import { Utensils } from 'lucide-react';
import type { NutritionPlanResponseDto } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import {
  formatKcal,
  formatMealCount,
  formatSignedKcal,
  formatGrams,
} from '@/features/client-nutrition/lib/formatters';

export function PlanTotals({
  plan,
  variant = 'client',
}: {
  plan: NutritionPlanResponseDto;
  variant?: 'client' | 'trainer';
}) {
  const daily = formatKcal(plan.targets.caloriesKcal ?? null);
  const mealTotal = formatKcal(plan.mealPlanTotals.caloriesKcal);
  const difference = formatSignedKcal(plan.targetDifferences.caloriesDifferenceKcal ?? null);
  const meals = formatMealCount(
    plan.meals.length,
    clientNutritionCopy.totals.meal,
    clientNutritionCopy.totals.meals,
  );
  const nutrients = [
    { label: clientNutritionCopy.targets.calories, total: plan.mealPlanTotals.caloriesKcal, target: plan.targets.caloriesKcal, difference: plan.targetDifferences.caloriesDifferenceKcal, format: formatKcal },
    { label: clientNutritionCopy.targets.protein, total: plan.mealPlanTotals.proteinG, target: plan.targets.proteinG, difference: plan.targetDifferences.proteinDifferenceG, format: formatGrams },
    { label: clientNutritionCopy.targets.carbs, total: plan.mealPlanTotals.carbohydratesG, target: plan.targets.carbohydratesG, difference: plan.targetDifferences.carbohydratesDifferenceG, format: formatGrams },
    { label: clientNutritionCopy.targets.fat, total: plan.mealPlanTotals.fatG, target: plan.targets.fatG, difference: plan.targetDifferences.fatDifferenceG, format: formatGrams },
  ];

  return (
    <section
      className={variant === 'trainer' ? 'workspace-surface space-y-4' : 'client-surface-card space-y-4'}
      aria-labelledby="nutrition-info-heading"
    >
      <div className="flex items-start gap-3">
        <Utensils className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 id="nutrition-info-heading" className="text-lg font-semibold tracking-tight">
            {clientNutritionCopy.totals.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{meals}</p>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{clientNutritionCopy.totals.comparison}</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {nutrients.map((nutrient) => {
            const target = nutrient.target;
            const hasTarget = typeof target === 'number' && Number.isFinite(target) && target >= 0;
            const width = hasTarget && target > 0 ? Math.min(100, Math.max(0, nutrient.total / target * 100)) : 0;
            const delta = nutrient.difference;
            return (
              <section key={nutrient.label} aria-label={nutrient.label} className="min-w-0 space-y-3 rounded-md border border-border p-3">
                <h4 className="text-sm font-medium">{nutrient.label}</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{clientNutritionCopy.totals.planned}</dt><dd className="text-numeric">{nutrient.format(nutrient.total)}</dd></div>
                  <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{clientNutritionCopy.totals.target}</dt><dd className="text-numeric">{hasTarget ? nutrient.format(target) : clientNutritionCopy.totals.noTarget}</dd></div>
                  {hasTarget && typeof delta === 'number' && Number.isFinite(delta) ? <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{clientNutritionCopy.totals.difference}</dt><dd className="text-numeric">{delta > 0 ? '+' : delta < 0 ? '−' : ''}{nutrient.format(Math.abs(delta))}</dd></div> : null}
                </dl>
                {hasTarget && target > 0 ? <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} /></div> : null}
              </section>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{clientNutritionCopy.totals.savedHint}</p>
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
