import type { NutritionPlanMealResponseDto } from '@/generated/models';
import { FoodItem } from '@/features/client-nutrition/components/food-item';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';
import { mealTypeIcon } from '@/features/client-nutrition/lib/meal-type-icon';
import { sortedItems } from '@/features/client-nutrition/lib/plan-helpers';

export function MealCard({ meal }: { meal: NutritionPlanMealResponseDto }) {
  const items = sortedItems(meal);
  const Icon = mealTypeIcon(meal.mealType);
  const calories = formatKcal(meal.totals.caloriesKcal);
  const protein = formatGrams(meal.totals.proteinG);
  const carbs = formatGrams(meal.totals.carbohydratesG);
  const fat = formatGrams(meal.totals.fatG);
  const fiber = formatGrams(meal.totals.fiberG);
  const macros = [protein, carbs, fat, fiber ? `${fiber} ${clientNutritionCopy.meals.fiber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="client-surface-card space-y-4">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-lg font-semibold tracking-tight">{meal.name}</h4>
          {calories ? (
            <p className="text-numeric text-xl font-medium tracking-tight text-foreground">
              {calories}
            </p>
          ) : null}
          {macros ? <p className="text-numeric text-sm text-muted-foreground">{macros}</p> : null}
          {meal.notes ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{meal.notes}</p>
          ) : null}
        </div>
      </header>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <FoodItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{clientNutritionCopy.meals.noFoods}</p>
      )}
    </article>
  );
}
