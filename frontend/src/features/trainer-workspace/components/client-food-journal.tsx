import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTrainerNutritionJournalGetDay } from '@/generated/nutrition-journal/nutrition-journal';
import type { JournalPlannedItemDtoStatus } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import {
  addDays,
  formatJournalDate,
  localIsoDate,
} from '@/features/client-nutrition/lib/journal-date';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatKcal } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { interpolate } from '@/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

const copy = trainerWorkspaceCopy.nutritionJournal;

const statusLabel: Record<JournalPlannedItemDtoStatus, string> = {
  PENDING: copy.statusPENDING,
  EATEN: copy.statusEATEN,
  REPLACED: copy.statusREPLACED,
  SKIPPED: copy.statusSKIPPED,
};

/** Read-only view of an assigned Client's day (D5: only the assigned TRAINER). */
export function ClientFoodJournal({ clientId }: { clientId: string }) {
  const [date, setDate] = useState(localIsoDate());
  const query = useTrainerNutritionJournalGetDay(clientId, date, {
    query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS },
  });
  const day = query.data;

  return (
    <section className="space-y-3" aria-labelledby="client-food-journal-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="client-food-journal-heading" className="text-lg font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDate(addDays(date, -1))}
            aria-label={copy.previousDay}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">
            {formatJournalDate(date)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDate(addDays(date, 1))}
            aria-label={copy.nextDay}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <WorkspaceSurface>
          <TrainerSectionSkeleton label={copy.loadingLabel} />
        </WorkspaceSurface>
      ) : query.isError || !day ? (
        <TrainerErrorState
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) void query.refetch();
          }}
        />
      ) : (
        <WorkspaceSurface className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: copy.target, value: formatKcal(day.targets.caloriesKcal) ?? trainerWorkspaceCopy.notSet },
              { label: copy.eaten, value: formatKcal(day.consumed.caloriesKcal) ?? '0 kcal' },
              {
                label: copy.remaining,
                value: formatKcal(day.remainingCaloriesKcal) ?? trainerWorkspaceCopy.notSet,
              },
              {
                label: copy.adherence,
                value: `${day.adherence.plannedItems - day.adherence.pending} / ${day.adherence.plannedItems}`,
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md border border-border p-3">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="font-mono text-lg tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
          {day.plan ? null : <p className="text-sm text-muted-foreground">{copy.noPlan}</p>}
          <div className="divide-y divide-border">
            {day.meals
              .filter((meal) => meal.plannedItems.length > 0 || meal.extraEntries.length > 0)
              .map((meal) => (
                <div key={meal.mealType} className="py-3 first:pt-0 last:pb-0">
                  <h3 className="mb-2 text-sm font-semibold">
                    {clientNutritionCopy.mealType[meal.mealType]}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {meal.plannedItems.map((item) => (
                      <li key={item.planItemId} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {item.foodName}{' '}
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {item.quantityGrams} g
                          </span>
                          {item.status === 'REPLACED' && item.entry ? (
                            <span className="block text-xs text-muted-foreground">
                              {interpolate(copy.replacedWith, { food: item.entry.foodName ?? '' })}
                            </span>
                          ) : null}
                        </span>
                        <Badge
                          variant={
                            item.status === 'EATEN'
                              ? 'default'
                              : item.status === 'PENDING'
                                ? 'muted'
                                : item.status === 'SKIPPED'
                                  ? 'outline'
                                  : 'secondary'
                          }
                        >
                          {statusLabel[item.status]}
                        </Badge>
                      </li>
                    ))}
                    {meal.extraEntries.map((entry) => (
                      <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {entry.foodName}{' '}
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {formatKcal(entry.nutrition.caloriesKcal)}
                          </span>
                        </span>
                        <Badge variant="outline">{copy.extra}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </WorkspaceSurface>
      )}
    </section>
  );
}
