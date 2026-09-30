import { Link } from '@tanstack/react-router';
import { ArrowLeftRight, Check, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react';
import type {
  JournalEntryDto,
  JournalMealDto,
  JournalPlannedItemDto,
} from '@/generated/models';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';
import { mealTypeIcon } from '@/features/client-nutrition/lib/meal-type-icon';
import { interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

export type PlannedAction = 'eaten' | 'skip' | 'clear';

function amountLabel(entry: JournalEntryDto): string | null {
  if (entry.portionLabel && entry.portionQuantity) {
    const quantity = Number(entry.portionQuantity);
    return `${quantity === 1 ? '' : `${quantity} × `}${entry.portionLabel}`;
  }
  return formatGrams(entry.grams);
}

function PlannedRow({
  item,
  date,
  editable,
  busy,
  onAction,
}: {
  item: JournalPlannedItemDto;
  date: string;
  editable: boolean;
  busy: boolean;
  onAction: (planItemId: string, action: PlannedAction) => void;
}) {
  const copy = useClientNutritionCopy();
  const pending = item.status === 'PENDING';
  const statusText =
    item.status === 'EATEN'
      ? copy.journal.statusEaten
      : item.status === 'SKIPPED'
        ? copy.journal.statusSkipped
        : item.status === 'REPLACED'
          ? interpolate(copy.journal.statusReplaced, { food: item.entry?.foodName ?? '' })
          : null;

  return (
    <li
      className={cn(
        'space-y-3 py-3 first:pt-0 last:pb-0',
        item.status === 'SKIPPED' && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-medium',
              item.status === 'SKIPPED' && 'line-through decoration-muted-foreground',
            )}
          >
            {item.foodName}
          </p>
          <p className="text-numeric text-xs text-muted-foreground">
            {[formatGrams(item.quantityGrams), formatKcal(item.nutrition.caloriesKcal)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {statusText ? (
          <Badge variant={item.status === 'SKIPPED' ? 'outline' : 'secondary'} className="max-w-[45%] truncate">
            {statusText}
          </Badge>
        ) : (
          <Badge variant="muted">{copy.journal.prescribed}</Badge>
        )}
      </div>
      {editable ? (
        pending ? (
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onAction(item.planItemId, 'eaten')}
              aria-label={`${copy.journal.markEaten}: ${item.foodName}`}
            >
              <Check className="size-4" aria-hidden />
              {copy.journal.markEaten}
            </Button>
            <Link
              to="/client/nutrition/add"
              search={{ date, meal: undefined, replace: item.planItemId }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted"
              aria-label={`${copy.journal.change}: ${item.foodName}`}
            >
              <ArrowLeftRight className="size-4" aria-hidden />
              {copy.journal.change}
            </Link>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onAction(item.planItemId, 'skip')}
              aria-label={`${copy.journal.skip}: ${item.foodName}`}
            >
              <X className="size-4" aria-hidden />
              {copy.journal.skip}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2"
            disabled={busy}
            onClick={() => onAction(item.planItemId, 'clear')}
            aria-label={`${copy.journal.undo}: ${item.foodName}`}
          >
            <Undo2 className="size-4" aria-hidden />
            {copy.journal.undo}
          </Button>
        )
      ) : null}
    </li>
  );
}

function ExtraRow({
  entry,
  date,
  editable,
  busy,
  onDelete,
}: {
  entry: JournalEntryDto;
  date: string;
  editable: boolean;
  busy: boolean;
  onDelete: (entryId: string) => void;
}) {
  const copy = useClientNutritionCopy();
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate font-medium">{entry.foodName}</p>
        <p className="text-numeric text-xs text-muted-foreground">
          {[amountLabel(entry), formatKcal(entry.nutrition.caloriesKcal)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {editable && entry.foodId ? (
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/client/nutrition/foods/$foodId"
            params={{ foodId: entry.foodId }}
            search={{ date, meal: entry.mealType, entry: entry.id }}
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
            aria-label={`${copy.journal.edit}: ${entry.foodName ?? ''}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="size-9"
            disabled={busy}
            onClick={() => onDelete(entry.id)}
            aria-label={`${copy.journal.delete}: ${entry.foodName ?? ''}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <Badge variant="outline">{copy.journal.extraEntry}</Badge>
      )}
    </li>
  );
}

export function JournalMealSection({
  meal,
  date,
  editable,
  busy,
  onPlannedAction,
  onDeleteEntry,
}: {
  meal: JournalMealDto;
  date: string;
  editable: boolean;
  busy: boolean;
  onPlannedAction: (planItemId: string, action: PlannedAction) => void;
  onDeleteEntry: (entryId: string) => void;
}) {
  const copy = useClientNutritionCopy();
  const label = copy.mealType[meal.mealType];
  const Icon = mealTypeIcon(meal.mealType);
  const headingId = `journal-meal-${meal.mealType.toLowerCase()}`;
  const hasItems = meal.plannedItems.length > 0 || meal.extraEntries.length > 0;
  const calories =
    meal.plannedCaloriesKcal > 0
      ? `${formatKcal(meal.consumedCaloriesKcal) ?? '0 kcal'} / ${formatKcal(meal.plannedCaloriesKcal) ?? ''}`
      : formatKcal(meal.consumedCaloriesKcal);

  return (
    <section className="space-y-2.5" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <h2 id={headingId} className="truncate text-lg font-semibold tracking-tight">
            {label}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {hasItems && calories ? (
            <span className="text-numeric text-xs text-muted-foreground">{calories}</span>
          ) : null}
          {editable ? (
            <Link
              to="/client/nutrition/add"
              search={{ date, meal: meal.mealType }}
              className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
              aria-label={interpolate(copy.journal.addToMeal, { meal: label })}
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      {hasItems ? (
        <div className="client-surface-card">
          <ul className="divide-y divide-border">
            {meal.plannedItems.map((item) => (
              <PlannedRow
                key={item.planItemId}
                item={item}
                date={date}
                editable={editable}
                busy={busy}
                onAction={onPlannedAction}
              />
            ))}
            {meal.extraEntries.map((entry) => (
              <ExtraRow
                key={entry.id}
                entry={entry}
                date={date}
                editable={editable}
                busy={busy}
                onDelete={onDeleteEntry}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {editable ? (
        <Link
          to="/client/nutrition/add"
          search={{ date, meal: meal.mealType }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
          {interpolate(copy.journal.addToMeal, { meal: label })}
        </Link>
      ) : null}
    </section>
  );
}
