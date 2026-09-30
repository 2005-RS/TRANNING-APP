import { useEffect, useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { ChevronRight, Plus, Search, UtensilsCrossed } from 'lucide-react';
import { useClientNutritionFoodsSearch } from '@/generated/client-nutrition-foods/client-nutrition-foods';
import type {
  ClientFoodSummaryDto,
  ClientNutritionFoodsSearchScope,
} from '@/generated/models';
import { JournalFlowHeader } from '@/features/client-nutrition/components/journal-flow-header';
import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { useJournalDay } from '@/features/client-nutrition/hooks/use-nutrition-journal';
import { formatKcal } from '@/features/client-nutrition/lib/formatters';
import { localIsoDate } from '@/features/client-nutrition/lib/journal-date';
import type { JournalSearch } from '@/features/client-nutrition/lib/journal-search';
import { interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { PageContainer } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';

const PAGE_SIZE = 30;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function FoodRow({
  food,
  search,
}: {
  food: ClientFoodSummaryDto;
  search: JournalSearch;
}) {
  const copy = useClientNutritionCopy();
  const kcalLine = food.defaultPortion
    ? interpolate(copy.search.perPortion, {
        kcal: formatKcal(food.defaultPortion.caloriesKcal) ?? '',
        portion: food.defaultPortion.label,
      })
    : interpolate(copy.search.per100, {
        kcal: formatKcal(food.nutritionPer100g.caloriesKcal) ?? '',
      });
  return (
    <li>
      <Link
        to="/client/nutrition/foods/$foodId"
        params={{ foodId: food.id }}
        search={search}
        className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <UtensilsCrossed className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{food.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {food.brand ? `${food.brand} · ` : ''}
            {kcalLine}
          </span>
          {food.inPlan || food.isOwn ? (
            <span className="mt-1 flex gap-1.5">
              {food.inPlan ? <Badge variant="secondary">{copy.search.inPlan}</Badge> : null}
              {food.isOwn ? <Badge variant="outline">{copy.search.own}</Badge> : null}
            </span>
          ) : null}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export function FoodSearchPage() {
  const copy = useClientNutritionCopy();
  const params = useSearch({ from: '/client/nutrition/add' });
  const date = params.date ?? localIsoDate();
  const [text, setText] = useState('');
  const [scope, setScope] = useState<ClientNutritionFoodsSearchScope>(
    params.replace ? 'ALL' : 'PLAN',
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const search = useDebounced(text.trim(), 300);
  const query = useClientNutritionFoodsSearch(
    { search: search || undefined, scope, limit },
    { query: { staleTime: 30_000, placeholderData: (previous) => previous } },
  );
  const day = useJournalDay(date);
  const replacing = params.replace
    ? day.data?.meals
        .flatMap((meal) => meal.plannedItems)
        .find((item) => item.planItemId === params.replace)
    : undefined;

  const tabs: Array<{ value: ClientNutritionFoodsSearchScope; label: string }> = [
    { value: 'PLAN', label: copy.search.tabPlan },
    { value: 'ALL', label: copy.search.tabAll },
    { value: 'RECENT', label: copy.search.tabRecent },
  ];
  const emptyText =
    scope === 'RECENT'
      ? copy.search.emptyRecent
      : scope === 'PLAN' && !search
        ? copy.search.emptyPlan
        : copy.search.empty;
  const rowSearch: JournalSearch = {
    date: params.date,
    meal: params.meal,
    replace: params.replace,
  };

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <JournalFlowHeader date={params.date} title={copy.search.title}>
        <Link
          to="/client/nutrition/foods/new"
          search={{ date: params.date, meal: params.meal }}
          className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted"
          aria-label={copy.search.createOwn}
        >
          <Plus className="size-5" aria-hidden />
        </Link>
      </JournalFlowHeader>

      {replacing ? (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">
          {interpolate(copy.search.replacing, { food: replacing.foodName })}
        </p>
      ) : null}

      <label className="relative mb-4 block">
        <span className="sr-only">{copy.search.placeholder}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setLimit(PAGE_SIZE);
          }}
          placeholder={copy.search.placeholder}
          className="h-12 rounded-full pl-9"
          autoComplete="off"
        />
      </label>

      <div role="tablist" aria-label={copy.search.title} className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={scope === tab.value}
            onClick={() => {
              setScope(tab.value);
              setLimit(PAGE_SIZE);
            }}
            className={cn(
              'h-9 shrink-0 rounded-full px-4 text-sm font-medium',
              scope === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {query.isPending ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : query.isError ? (
          <NutritionError
            error={query.error}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.data.length === 0 ? (
          <div className="client-surface-card space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
            <Link
              to="/client/nutrition/foods/new"
              search={{ date: params.date, meal: params.meal }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" aria-hidden />
              {copy.search.createOwn}
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {query.data.data.map((food) => (
                <FoodRow key={food.id} food={food} search={rowSearch} />
              ))}
            </ul>
            {query.data.meta.totalItems > query.data.data.length ? (
              <button
                type="button"
                className="mt-4 w-full rounded-lg py-3 text-sm font-medium text-primary hover:bg-muted"
                onClick={() => setLimit((current) => Math.min(current + PAGE_SIZE, 50))}
                disabled={limit >= 50}
              >
                {copy.search.loadMore}
              </button>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
