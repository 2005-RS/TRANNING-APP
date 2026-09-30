import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useClientNutritionFoodsGetFood } from '@/generated/client-nutrition-foods/client-nutrition-foods';
import type {
  JournalMealDtoMealType,
  NutritionFoodResponseDto,
} from '@/generated/models';
import { JournalFlowHeader } from '@/features/client-nutrition/components/journal-flow-header';
import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import {
  useJournalDay,
  useJournalEntryMutations,
} from '@/features/client-nutrition/hooks/use-nutrition-journal';
import { formatGrams, formatNutritionAmount } from '@/features/client-nutrition/lib/formatters';
import { localIsoDate } from '@/features/client-nutrition/lib/journal-date';
import { mealTypeIcon } from '@/features/client-nutrition/lib/meal-type-icon';
import { MEAL_TYPE_ORDER } from '@/features/client-nutrition/lib/plan-helpers';
import { interpolate } from '@/i18n/format';
import { useLanguage } from '@/i18n/use-language';
import { cn } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { PageContainer } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';

const GRAMS = 'g';
const CORE = ['energy_kcal', 'protein_g', 'carbohydrates_g', 'fat_g'];

type Unit = typeof GRAMS | string; // 'g' or a portion id

function per100(food: NutritionFoodResponseDto): Record<string, number | null> {
  const vector: Record<string, number | null> = {};
  for (const nutrient of food.nutrients) {
    vector[nutrient.code] = nutrient.amountPer100g ?? null;
  }
  vector.energy_kcal ??= food.nutritionPer100g.caloriesKcal;
  vector.protein_g ??= food.nutritionPer100g.proteinG;
  vector.carbohydrates_g ??= food.nutritionPer100g.carbohydratesG;
  vector.fat_g ??= food.nutritionPer100g.fatG;
  return vector;
}

function parseAmount(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Preview only: the server recomputes and stores the snapshot on save. */
function scaled(value: number | null | undefined, grams: number): number | null {
  return value === null || value === undefined ? null : (value * grams) / 100;
}

function FoodLogForm({ food }: { food: NutritionFoodResponseDto }) {
  const copy = useClientNutritionCopy();
  const { language } = useLanguage();
  const params = useSearch({ from: '/client/nutrition/foods/$foodId' });
  const navigate = useNavigate();
  const date = params.date ?? localIsoDate();
  const day = useJournalDay(date);
  const { addEntry, updateEntry } = useJournalEntryMutations();

  const allEntries = day.data?.meals.flatMap((meal) => [
    ...meal.extraEntries,
    ...meal.plannedItems.flatMap((item) => (item.entry ? [item.entry] : [])),
  ]);
  const editing = params.entry ? allEntries?.find((entry) => entry.id === params.entry) : undefined;
  const replacing = params.replace
    ? day.data?.meals.flatMap((meal) => meal.plannedItems).find((item) => item.planItemId === params.replace)
    : undefined;
  const replacingMeal = replacing
    ? day.data?.meals.find((meal) => meal.plannedItems.includes(replacing))?.mealType
    : undefined;

  const portions = food.portions;
  const defaultPortion = portions.find((portion) => portion.isDefault) ?? portions[0];
  const editingPortion = editing?.portionLabel
    ? portions.find((portion) => portion.label === editing.portionLabel)
    : undefined;

  const [mealType, setMealType] = useState<JournalMealDtoMealType>(
    replacingMeal ?? editing?.mealType ?? params.meal ?? 'OTHER',
  );
  const [unit, setUnit] = useState<Unit>(() => {
    if (editing) return editingPortion?.id ?? GRAMS;
    if (replacing) return GRAMS;
    return defaultPortion?.id ?? GRAMS;
  });
  const [amountText, setAmountText] = useState(() => {
    if (editing) {
      return String(editingPortion ? editing.portionQuantity ?? 1 : editing.grams ?? 100);
    }
    if (replacing) return String(replacing.quantityGrams);
    return defaultPortion ? '1' : '100';
  });

  const amount = parseAmount(amountText);
  const portion = unit === GRAMS ? undefined : portions.find((item) => item.id === unit);
  const grams = amount === null ? null : portion ? portion.gramWeight * amount : amount;
  const base = useMemo(() => per100(food), [food]);
  const value = (code: string) => (grams === null ? null : scaled(base[code], grams));
  const others = food.nutrients.filter((nutrient) => !CORE.includes(nutrient.code));
  const saving = addEntry.isPending || updateEntry.isPending;
  const failed = addEntry.isError || updateEntry.isError;

  const submit = () => {
    if (amount === null) return;
    const quantity = portion
      ? { portionId: portion.id, portionQuantity: amount }
      : { grams: Math.round(amount * 100) / 100 };
    const done = () =>
      void navigate({ to: '/client/nutrition', search: { date: params.date } });
    if (editing) {
      updateEntry.mutate(
        { entryId: editing.id, data: { ...quantity, mealType } },
        { onSuccess: done },
      );
    } else {
      addEntry.mutate(
        {
          date,
          data: { ...quantity, mealType, foodId: food.id, planItemId: params.replace },
        },
        { onSuccess: done },
      );
    }
  };

  const number = (input: number | null) =>
    input === null ? copy.food.unknown : formatNutritionAmount(input) ?? copy.food.unknown;

  return (
    <form
      className="space-y-7"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{food.name}</h2>
        {food.brand ? <p className="text-sm text-muted-foreground">{food.brand}</p> : null}
        {food.nameOriginal && food.nameOriginal !== food.name ? (
          <p className="text-xs text-muted-foreground" lang="en">
            {food.nameOriginal}
          </p>
        ) : null}
        {replacing ? (
          <p className="pt-1 text-sm text-muted-foreground">
            {interpolate(copy.food.prescribedAmount, {
              amount: `${replacing.foodName} · ${formatGrams(replacing.quantityGrams) ?? ''}`,
            })}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3" disabled={Boolean(replacing)}>
        <legend className="text-lg font-semibold tracking-tight">{copy.food.mealType}</legend>
        <div className="grid grid-cols-5 gap-2">
          {MEAL_TYPE_ORDER.map((type) => {
            const Icon = mealTypeIcon(type);
            const selected = mealType === type;
            return (
              <label
                key={type}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center text-[11px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  selected
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                <input
                  type="radio"
                  name="mealType"
                  value={type}
                  checked={selected}
                  onChange={() => setMealType(type)}
                  className="sr-only"
                />
                <Icon className="size-5" aria-hidden />
                <span className="leading-tight">{copy.mealType[type]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold tracking-tight">{copy.food.portionUnit}</legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...portions.map((item) => ({ id: item.id, label: item.label })), { id: GRAMS, label: copy.food.grams }].map(
            (option) => (
              <label
                key={option.id}
                className={cn(
                  'h-10 shrink-0 cursor-pointer rounded-full px-4 text-sm leading-10 font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  unit === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <input
                  type="radio"
                  name="unit"
                  value={option.id}
                  checked={unit === option.id}
                  onChange={() => {
                    setUnit(option.id);
                    setAmountText(option.id === GRAMS ? String(Math.round(grams ?? 100)) : '1');
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            ),
          )}
        </div>
        <label className="flex items-center justify-between gap-4">
          <span className="text-base font-medium">{copy.food.amount}</span>
          <span className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              className="text-numeric h-11 w-28 text-right text-lg"
              aria-invalid={amount === null}
              aria-describedby={amount === null ? 'food-amount-error' : undefined}
            />
            <span className="w-6 text-muted-foreground">{portion ? '×' : copy.food.grams}</span>
          </span>
        </label>
        {amount === null ? (
          <p id="food-amount-error" className="text-sm text-danger">
            {copy.food.invalidAmount}
          </p>
        ) : portion && grams !== null ? (
          <p className="text-right text-xs text-muted-foreground">= {formatGrams(grams)}</p>
        ) : null}
      </fieldset>

      <section className="space-y-3" aria-labelledby="food-main-macros">
        <h3 id="food-main-macros" className="text-lg font-semibold tracking-tight">
          {copy.food.mainMacros}
        </h3>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div className="client-surface-card flex min-w-28 flex-col items-center justify-center">
            <span className="text-numeric text-3xl font-semibold">
              {number(value('energy_kcal') === null ? null : Math.round(value('energy_kcal')!))}
            </span>
            <span className="text-sm text-muted-foreground">{copy.food.calories}</span>
          </div>
          <dl className="client-surface-card space-y-2 text-sm">
            {[
              { label: copy.targets.protein, code: 'protein_g' },
              { label: copy.targets.carbs, code: 'carbohydrates_g' },
              { label: copy.targets.fat, code: 'fat_g' },
            ].map(({ label, code }) => (
              <div key={code} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-numeric font-medium">
                  {value(code) === null ? copy.food.unknown : formatGrams(value(code))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="space-y-3" aria-labelledby="food-other-nutrients">
          <h3 id="food-other-nutrients" className="text-lg font-semibold tracking-tight">
            {copy.food.otherNutrients}
          </h3>
          <dl className="client-surface-card divide-y divide-border text-sm">
            {others.map((nutrient) => (
              <div key={nutrient.code} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <dt className="text-muted-foreground">
                  {language === 'es' ? nutrient.nameEs : nutrient.nameEn}
                </dt>
                <dd className="text-numeric">
                  {value(nutrient.code) === null
                    ? copy.food.unknown
                    : `${number(value(nutrient.code))} ${nutrient.unit === 'ug' ? 'µg' : nutrient.unit}`}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {food.source === 'OPEN_FOOD_FACTS' ? (
        <p className="text-xs text-muted-foreground">{copy.food.sourceOpenFoodFacts}</p>
      ) : food.source === 'USDA_FDC' ? (
        <p className="text-xs text-muted-foreground">{copy.food.sourceUsda}</p>
      ) : food.visibility === 'PRIVATE' ? (
        <p className="text-xs text-muted-foreground">{copy.food.ownFood}</p>
      ) : null}

      {failed ? <Alert variant="danger">{copy.journal.actionFailed}</Alert> : null}

      <div className="sticky bottom-[calc(var(--client-bottom-nav-height,4.5rem)+0.5rem)] -mx-4 bg-background/95 px-4 pt-3 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="submit" size="lg" className="w-full" disabled={saving || amount === null}>
          {saving ? copy.food.saving : editing ? copy.food.update : copy.food.save}
        </Button>
      </div>
    </form>
  );
}

export function FoodLogPage() {
  const copy = useClientNutritionCopy();
  const { foodId } = useParams({ from: '/client/nutrition/foods/$foodId' });
  const params = useSearch({ from: '/client/nutrition/foods/$foodId' });
  const query = useClientNutritionFoodsGetFood(foodId, { query: { staleTime: 60_000 } });

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <JournalFlowHeader date={params.date} title={copy.food.title} />
      {query.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <NutritionError
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FoodLogForm key={`${query.data.id}-${params.entry ?? ''}`} food={query.data} />
      )}
    </PageContainer>
  );
}
