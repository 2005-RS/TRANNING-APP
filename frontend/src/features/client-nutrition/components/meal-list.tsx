import type { NutritionPlanMealResponseDto } from '@/generated/models';
import { FoodItem } from '@/features/client-nutrition/components/food-item';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';
import { sortedItems } from '@/features/client-nutrition/lib/plan-helpers';

export function MealCard({ meal }: { meal: NutritionPlanMealResponseDto }) {
  const items = sortedItems(meal);
  const typeLabel = clientNutritionCopy.mealType[meal.mealType];
  const calories = formatKcal(meal.totals.caloriesKcal);
  const protein = formatGrams(meal.totals.proteinG);
  const carbs = formatGrams(meal.totals.carbohydratesG);
  const fat = formatGrams(meal.totals.fatG);
  const fiber = formatGrams(meal.totals.fiberG);
  const summary = [calories, protein, carbs, fat, fiber ? `${fiber} ${clientNutritionCopy.meals.fiber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="client-surface-card space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {typeLabel}
        </p>
        <h3 className="text-lg font-semibold tracking-tight">{meal.name}</h3>
        {summary ? (
          <p className="text-numeric text-sm text-muted-foreground">{summary}</p>
        ) : null}
        {meal.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{meal.notes}</p>
        ) : null}
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
