import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { AddFoodSheet } from '@/features/client-nutrition/components/add-food-sheet';
import {
  JournalMealSection,
  type PlannedAction,
} from '@/features/client-nutrition/components/journal-meal-section';
import { JournalSummaryCard } from '@/features/client-nutrition/components/journal-summary-card';
import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { NutritionSkeleton } from '@/features/client-nutrition/components/nutrition-skeleton';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import {
  useJournalDay,
  useJournalEntryMutations,
  usePlannedItemActions,
} from '@/features/client-nutrition/hooks/use-nutrition-journal';
import {
  addDays,
  formatJournalDate,
  localIsoDate,
  mealForTime,
  relativeDay,
} from '@/features/client-nutrition/lib/journal-date';
import { interpolate } from '@/i18n/format';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';

export function NutritionTodayPage() {
  const copy = useClientNutritionCopy();
  const search = useSearch({ from: '/client/nutrition' });
  const navigate = useNavigate({ from: '/client/nutrition' });
  const date = search.date ?? localIsoDate();
  const query = useJournalDay(date);
  const { markEaten, skip, clear } = usePlannedItemActions(date);
  const { deleteEntry } = useJournalEntryMutations();
  const [sheetOpen, setSheetOpen] = useState(false);

  const relative = relativeDay(date);
  const dayLabel =
    relative === 'today'
      ? copy.journal.today
      : relative === 'yesterday'
        ? copy.journal.yesterday
        : relative === 'tomorrow'
          ? copy.journal.tomorrow
          : formatJournalDate(date);
  const goTo = (next: string) =>
    void navigate({ search: { date: next === localIsoDate() ? undefined : next }, replace: true });

  const busy = markEaten.isPending || skip.isPending || clear.isPending || deleteEntry.isPending;
  const failed = markEaten.isError || skip.isError || clear.isError || deleteEntry.isError;
  const onPlannedAction = (planItemId: string, action: PlannedAction) => {
    const variables = { date, planItemId };
    if (action === 'eaten') markEaten.mutate(variables);
    else if (action === 'skip') skip.mutate(variables);
    else clear.mutate(variables);
  };

  const day = query.data;
  const done = day ? day.adherence.plannedItems - day.adherence.pending : 0;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <h1 className="sr-only">{copy.journal.title}</h1>
      <nav
        className="mb-4 flex items-center justify-between gap-2"
        aria-label={copy.journal.title}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(addDays(date, -1))}
          aria-label={copy.journal.previousDay}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <p className="text-center">
          <span className="block text-lg font-semibold tracking-tight">{dayLabel}</span>
          {relative ? (
            <span className="block text-xs text-muted-foreground">{formatJournalDate(date)}</span>
          ) : null}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(addDays(date, 1))}
          aria-label={copy.journal.nextDay}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </nav>

      {query.isPending ? (
        <NutritionSkeleton />
      ) : query.isError || !day ? (
        <NutritionError
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) void query.refetch();
          }}
        />
      ) : (
        <div className="space-y-6">
          <JournalSummaryCard day={day} />

          {day.editable ? (
            <Button size="lg" className="w-full" onClick={() => setSheetOpen(true)}>
              <Plus className="size-5" aria-hidden />
              {copy.journal.addFood}
            </Button>
          ) : (
            <Alert role="status">{copy.journal.readOnly}</Alert>
          )}

          {failed ? (
            <Alert variant="danger">
              {copy.journal.actionFailed}
            </Alert>
          ) : null}

          {day.plan ? (
            <div className="flex items-center justify-between gap-3 px-1 text-sm">
              <p className="text-muted-foreground">
                {interpolate(copy.journal.adherence, {
                  done,
                  total: day.adherence.plannedItems,
                })}
              </p>
              <Link
                to="/client/nutrition/plan"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <ClipboardList className="size-4" aria-hidden />
                {copy.journal.planLink}
              </Link>
            </div>
          ) : (
            <section className="client-surface-card space-y-1.5">
              <h2 className="font-semibold">{copy.journal.noPlanTitle}</h2>
              <p className="text-sm text-muted-foreground">{copy.journal.noPlanBody}</p>
            </section>
          )}

          <div className="space-y-6">
            {day.meals.map((meal) => (
              <JournalMealSection
                key={meal.mealType}
                meal={meal}
                date={date}
                editable={day.editable}
                busy={busy}
                onPlannedAction={onPlannedAction}
                onDeleteEntry={(entryId) => deleteEntry.mutate({ entryId })}
              />
            ))}
          </div>

          <AddFoodSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            date={date}
            meal={mealForTime()}
          />
        </div>
      )}
    </PageContainer>
  );
}
