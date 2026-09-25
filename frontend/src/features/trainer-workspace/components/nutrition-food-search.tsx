import { useId, useMemo, useState } from 'react';
import { NutritionFoodsListStatus, type NutritionFoodResponseDto } from '@/generated/models';
import { useNutritionFoodsList } from '@/generated/nutrition-foods/nutrition-foods';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatKcal } from '@/features/trainer-workspace/lib/formatters';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { mapApiError } from '@/shared/errors/api-error';

export function NutritionFoodSearch({ onSelect }: { onSelect: (food: NutritionFoodResponseDto) => void }) {
  const id = useId();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const copy = trainerWorkspaceCopy.nutrition;
  const params = useMemo(
    () => ({
      search: search || undefined,
      page,
      limit: 10,
      status: NutritionFoodsListStatus.ACTIVE,
    }),
    [page, search],
  );
  const query = useNutritionFoodsList(params, {
    query: { staleTime: 30_000, refetchOnWindowFocus: false },
  });
  const submitSearch = () => { setSearch(input.trim()); setPage(1); };

  return (
    <div className="min-w-0 space-y-3 rounded-md border border-border bg-background p-3">
      <Label htmlFor={id}>{copy.searchFoods}</Label>
      <div className="flex flex-wrap gap-2">
        <Input id={id} className="min-w-0 flex-1" value={input} maxLength={100}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitSearch(); } }} />
        <Button type="button" variant="outline" onClick={submitSearch}>{trainerWorkspaceCopy.search}</Button>
      </div>
      {query.isPending ? <p role="status" aria-label={trainerWorkspaceCopy.foods.loadingLabel}>{trainerWorkspaceCopy.foods.loadingLabel}</p> : query.isError ? (
        <Alert variant="danger">
          {mapApiError(query.error).description}
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>{trainerWorkspaceCopy.retry}</Button>
        </Alert>
      ) : query.data?.data.length ? (
        <>
          <ul className="divide-y divide-border">
            {query.data.data.map((food) => (
              <li key={food.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1 break-words">
                  <p className="text-sm font-medium">{food.name}{food.brand ? ` · ${food.brand}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{formatKcal(food.nutritionPer100g.caloriesKcal)} · {trainerWorkspaceCopy.foods.per100}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => onSelect(food)} aria-label={`${copy.addItem}: ${food.name}`}>{copy.addItem}</Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{trainerWorkspaceCopy.previous}</Button>
            <span className="font-mono text-xs tabular-nums">{page} / {query.data.meta.totalPages}</span>
            <Button type="button" variant="outline" disabled={page >= query.data.meta.totalPages} onClick={() => setPage(page + 1)}>{trainerWorkspaceCopy.next}</Button>
          </div>
        </>
      ) : <p role="status" className="text-sm text-muted-foreground">{copy.noFoodResults}</p>}
    </div>
  );
}
