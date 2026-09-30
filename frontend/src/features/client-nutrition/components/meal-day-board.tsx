import { MealCard } from '@/features/client-nutrition/components/meal-list';
import { mealTypeIcon } from '@/features/client-nutrition/lib/meal-type-icon';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatKcal } from '@/features/client-nutrition/lib/formatters';
import { mealsByType } from '@/features/client-nutrition/lib/plan-helpers';
import type { NutritionPlanMealResponseDto } from '@/generated/models';

export function MealDayBoard({ meals }: { meals: readonly NutritionPlanMealResponseDto[] }) {
  const groups = mealsByType(meals);

  if (groups.length === 0) {
    return (
      <section className="client-surface-card">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clientNutritionCopy.meals.empty}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="client-surface-card space-y-3" aria-labelledby="nutrition-glance-heading">
        <h3 id="nutrition-glance-heading" className="text-sm font-medium text-muted-foreground">
          {clientNutritionCopy.meals.glance}
        </h3>
        <ul className="space-y-2">
          {groups.flatMap(({ type, meals: typed }) =>
            typed.map((meal) => {
              const Icon = mealTypeIcon(type);
              const calories = formatKcal(meal.totals.caloriesKcal);
              return (
                <li key={meal.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate text-sm font-medium text-foreground">{meal.name}</span>
                  </span>
                  {calories ? (
                    <span className="text-numeric shrink-0 text-sm text-muted-foreground">
                      {calories}
                    </span>
                  ) : null}
                </li>
              );
            }),
          )}
        </ul>
      </section>

      {groups.map(({ type, meals: typed }) => {
        const headingId = `nutrition-meal-type-${type.toLowerCase()}`;
        return (
          <section key={type} className="space-y-3" aria-labelledby={headingId}>
            <h3 id={headingId} className="px-1 text-base font-semibold tracking-tight">
              {clientNutritionCopy.mealType[type]}
            </h3>
            {typed.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
