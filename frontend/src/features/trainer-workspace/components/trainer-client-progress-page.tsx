import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useProgressGetSummary, useProgressListExercises } from '@/generated/progress/progress';
import { useBodyMeasurementsList } from '@/generated/body-measurements/body-measurements';
import { LazyProgressChart } from '@/features/client-progress/charts/lazy-progress-chart';
import { bodyWeightPoints } from '@/features/client-progress/lib/chart-points';
import { percentChange } from '@/features/client-progress/lib/percent-change';
import {
  previousWindow,
  PROGRESS_PERIODS,
  DEFAULT_PROGRESS_PERIOD,
  windowForPeriod,
  type ProgressPeriod,
} from '@/features/client-progress/lib/period';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import {
  formatAmount,
  formatIsoDate,
  formatKg,
} from '@/features/trainer-workspace/lib/formatters';
import {
  TRAINER_PROGRESS_BODY_LIMIT,
  TRAINER_PROGRESS_EXERCISE_LIMIT,
  TRAINER_STALE_TIME_MS,
} from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';
import { formatDurationSeconds, formatPercent } from '@/features/client-progress/lib/formatters';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.progress;

export function TrainerClientProgressPage() {
  const clientId = useTrainerClientId();
  const navigate = useNavigate({ from: '/trainer/clients/$clientId/progress' });
  const search = useSearch({ from: '/trainer/clients/$clientId/progress' });
  const period = search.period ?? DEFAULT_PROGRESS_PERIOD;
  const window = windowForPeriod(period);
  const previous = previousWindow(window);
  const queryOptions = {
    query: {
      enabled: Boolean(clientId),
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  };
  const summaryQuery = useProgressGetSummary(clientId, window, queryOptions);
  const previousQuery = useProgressGetSummary(clientId, previous, queryOptions);
  const exercisesQuery = useProgressListExercises(
    clientId,
    { ...window, limit: TRAINER_PROGRESS_EXERCISE_LIMIT },
    queryOptions,
  );
  const bodyQuery = useBodyMeasurementsList(
    clientId,
    { ...window, limit: TRAINER_PROGRESS_BODY_LIMIT, hasBodyWeight: true },
    queryOptions,
  );

  function changePeriod(next: ProgressPeriod) {
    void navigate({ search: { period: next }, replace: true });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={copy.period}>
          {PROGRESS_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              className={cn(
                'min-h-10 rounded-md px-3 text-sm',
                period === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
              onClick={() => changePeriod(value)}
            >
              {value === 180 ? '6M' : value === 365 ? '1Y' : `${value}D`}
            </button>
          ))}
        </div>
      </div>

      {summaryQuery.isPending ? (
        <WorkspaceSurface>
          <TrainerSectionSkeleton label={copy.loadingLabel} />
        </WorkspaceSurface>
      ) : summaryQuery.isError || !summaryQuery.data ? (
        <TrainerErrorState
          error={summaryQuery.error}
          retrying={summaryQuery.isFetching}
          onRetry={() => {
            if (!summaryQuery.isFetching) {
              void summaryQuery.refetch();
            }
          }}
        />
      ) : (
        <WorkspaceSurface aria-labelledby="progress-summary-heading">
          <h3 id="progress-summary-heading" className="text-base font-semibold">
            {copy.title}
          </h3>
          {summaryQuery.data.completedSessions === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric
                label={copy.sessions}
                value={formatAmount(summaryQuery.data.completedSessions)}
                hint={delta(summaryQuery.data.completedSessions, previousQuery.data?.completedSessions)}
              />
              <Metric
                label={copy.volume}
                value={formatKg(summaryQuery.data.externalLoadVolumeKg)}
                hint={delta(summaryQuery.data.externalLoadVolumeKg, previousQuery.data?.externalLoadVolumeKg)}
              />
              <Metric label={copy.sets} value={formatAmount(summaryQuery.data.performedSets)} />
              <Metric label={copy.reps} value={formatAmount(summaryQuery.data.totalReps)} />
              <Metric
                label={copy.duration}
                value={formatDurationSeconds(summaryQuery.data.totalDurationSeconds)}
              />
              <Metric
                label={copy.lastSession}
                value={
                  summaryQuery.data.lastCompletedSessionAt
                    ? formatIsoDate(summaryQuery.data.lastCompletedSessionAt)
                    : trainerWorkspaceCopy.notSet
                }
              />
            </dl>
          )}
        </WorkspaceSurface>
      )}

      <WorkspaceSurface aria-labelledby="progress-body-heading">
        <h3 id="progress-body-heading" className="text-base font-semibold">
          {copy.bodyWeight}
        </h3>
        {bodyQuery.isPending ? (
          <TrainerSectionSkeleton label={copy.loadingLabel} rows={2} />
        ) : bodyQuery.data?.data.length ? (
          <LazyProgressChart
            points={bodyWeightPoints(bodyQuery.data.data)}
            label={copy.bodyWeight}
            summary={copy.bodyWeight}
          />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.bodyEmpty}</p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface aria-labelledby="progress-exercises-heading">
        <h3 id="progress-exercises-heading" className="text-base font-semibold">
          {copy.exerciseList}
        </h3>
        {exercisesQuery.isPending ? (
          <TrainerSectionSkeleton label={copy.loadingLabel} />
        ) : exercisesQuery.data?.data.length ? (
          <ul className="mt-3 divide-y divide-border">
            {exercisesQuery.data.data.map((item) => (
              <li key={`${item.exerciseId}-${item.prescriptionType}`}>
                <Link
                  to="/trainer/clients/$clientId/progress/exercises/$exerciseId"
                  params={{ clientId, exerciseId: item.exerciseId }}
                  search={{ period }}
                  className="flex min-h-12 items-center justify-between gap-3 py-2 hover:bg-muted/60"
                >
                  <span className="font-medium">{item.exerciseName}</span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {item.prescriptionType === 'REPS'
                      ? formatKg(item.externalLoadVolumeKg) ?? formatAmount(item.totalReps)
                      : formatDurationSeconds(item.totalDurationSeconds ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.exerciseEmpty}</p>
        )}
      </WorkspaceSurface>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg tabular-nums">{value ?? trainerWorkspaceCopy.notSet}</dd>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function delta(current: number, previous: number | undefined): string | null {
  if (previous == null) {
    return copy.noComparison;
  }
  const change = percentChange(current, previous);
  return change == null ? copy.noComparison : `${formatPercent(change)} ${copy.vsPrevious}`;
}
