import type { NutritionPlanMealItemResponseDto } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';

export function FoodItem({ item }: { item: NutritionPlanMealItemResponseDto }) {
  const quantity = formatGrams(item.quantityGrams);
  const calories = formatKcal(item.nutrition.caloriesKcal);
  const protein = formatGrams(item.nutrition.proteinG);
  const carbs = formatGrams(item.nutrition.carbohydratesG);
  const fat = formatGrams(item.nutrition.fatG);

  return (
    <li className="min-w-0 space-y-1.5 border-t border-border/60 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug text-foreground">{item.foodName}</p>
          {item.brand ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{item.brand}</p>
          ) : null}
        </div>
        {quantity ? (
          <p className="text-numeric shrink-0 text-sm font-medium text-foreground">{quantity}</p>
        ) : null}
      </div>
      <p className="text-numeric text-sm text-muted-foreground">
        {[calories, protein, carbs, fat].filter(Boolean).join(' · ')}
      </p>
      {item.notes ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clientNutritionCopy.meals.notes}: {item.notes}
        </p>
      ) : null}
    </li>
  );
}
