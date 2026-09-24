import { Link } from '@tanstack/react-router';
import type { ExerciseProgressListItemDto } from '@/generated/models';
import { ExerciseProgressListItemDtoPrescriptionType } from '@/generated/models';
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  formatCountLabel,
  formatDurationSeconds,
  formatIsoDate,
  formatKg,
} from '@/features/client-progress/lib/formatters';
import type { ProgressPeriod } from '@/features/client-progress/lib/period';

function exerciseHrefKey(item: ExerciseProgressListItemDto): string {
  return `${item.exerciseId}:${item.prescriptionType}`;
}

function primaryMetric(item: ExerciseProgressListItemDto): string | null {
  if (item.prescriptionType === ExerciseProgressListItemDtoPrescriptionType.DURATION) {
    return item.bestDurationSeconds != null
      ? formatDurationSeconds(item.bestDurationSeconds)
      : null;
  }
  return item.bestLoadKg != null ? formatKg(item.bestLoadKg) : null;
}

export function ExerciseListSection({
  items,
  totalItems,
  period,
}: {
  items: ExerciseProgressListItemDto[];
  totalItems: number;
  period: ProgressPeriod;
}) {
  return (
    <section className="space-y-4" aria-labelledby="progress-exercises-heading">
      <div>
        <h2
          id="progress-exercises-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {clientProgressCopy.exercises.title}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {items.length === 0
            ? clientProgressCopy.exercises.empty
            : clientProgressCopy.exercises.description}
        </p>
      </div>

      {items.length === 0 ? null : (
        <ul className="space-y-3">
          {items.map((item) => {
            const last = formatIsoDate(item.lastPerformedAt, 'd MMM');
            const metric = primaryMetric(item);
            const typeLabel =
              item.prescriptionType === ExerciseProgressListItemDtoPrescriptionType.DURATION
                ? clientProgressCopy.exercises.duration
                : clientProgressCopy.exercises.reps;

            return (
              <li key={exerciseHrefKey(item)}>
                <Link
                  to="/client/progress/exercises/$exerciseId"
                  params={{ exerciseId: item.exerciseId }}
                  search={{ period }}
                  className="client-surface-card flex min-h-16 items-center justify-between gap-3 no-underline"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {item.exerciseName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {typeLabel}
                      {item.exerciseStatus === 'ARCHIVED'
                        ? ` · ${clientProgressCopy.exercises.archived}`
                        : ''}
                      {' · '}
                      {formatCountLabel(
                        item.completedSessions,
                        clientProgressCopy.exercises.session,
                        clientProgressCopy.exercises.sessions,
                      )}
                      {last ? ` · ${clientProgressCopy.exercises.last} ${last}` : ''}
                    </p>
                  </div>
                  {metric ? (
                    <p className="text-numeric shrink-0 text-lg font-medium text-foreground">
                      {metric}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalItems > items.length ? (
        <p className="text-sm text-muted-foreground">
          {clientProgressCopy.exercises.more} · {items.length} / {totalItems}
        </p>
      ) : null}
    </section>
  );
}
