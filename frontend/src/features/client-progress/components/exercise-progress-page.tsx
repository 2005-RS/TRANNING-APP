import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ApiError } from '@/shared/errors/api-error';
import { LazyProgressChart } from '@/features/client-progress/charts/lazy-progress-chart';
import { ExerciseHistoryList } from '@/features/client-progress/components/exercise-history-list';
import { PeriodSelector } from '@/features/client-progress/components/period-selector';
import { PersonalBest } from '@/features/client-progress/components/personal-best';
import { SectionError } from '@/features/client-progress/components/section-error';
import { SectionSkeleton } from '@/features/client-progress/components/section-skeleton';
import { clientProgressCopy } from '@/features/client-progress/copy';
import { useExerciseProgress } from '@/features/client-progress/hooks/use-exercise-progress';
import {
  durationTrendPoints,
  repsLoadPoints,
  repsVolumePoints,
} from '@/features/client-progress/lib/chart-points';
import {
  formatDurationSeconds,
  formatKg,
} from '@/features/client-progress/lib/formatters';
import type { ProgressPeriod } from '@/features/client-progress/lib/period';
import { isUuid } from '@/features/workout-session/lib/session-ids';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

export function ExerciseProgressPage() {
  const navigate = useNavigate({ from: '/client/progress/exercises/$exerciseId' });
  const { exerciseId } = useParams({ from: '/client/progress/exercises/$exerciseId' });
  const { period } = useSearch({ from: '/client/progress/exercises/$exerciseId' });
  const query = useExerciseProgress(exerciseId, period);
  const validId = isUuid(exerciseId);

  function changePeriod(next: ProgressPeriod) {
    void navigate({
      search: { period: next },
      replace: true,
    });
  }

  const errorStatus = query.error instanceof ApiError ? query.error.statusCode : null;
  const notFound = errorStatus === 404 || errorStatus === 403;

  return (
    <PageContainer density="client" className="mx-auto max-w-5xl xl:max-w-6xl">
      <div className="flex flex-col gap-6 lg:gap-8">
        <PageHeader className="mb-0">
          <div className="space-y-3">
            <Link
              to="/client/progress"
              search={{ period }}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
            >
              {clientProgressCopy.detail.back}
            </Link>
            <PageTitle>
              {query.data?.exerciseName ?? clientProgressCopy.exercises.title}
            </PageTitle>
            {query.data?.exerciseStatus === 'ARCHIVED' ? (
              <PageDescription>{clientProgressCopy.exercises.archived}</PageDescription>
            ) : (
              <PageDescription>{clientProgressCopy.detail.visualizationNote}</PageDescription>
            )}
          </div>
        </PageHeader>

        <PeriodSelector period={period} onPeriodChange={changePeriod} />

        {!validId ? (
          <section className="client-surface-card space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {clientProgressCopy.detail.invalidId}
            </h2>
            <Link
              to="/client/progress"
              search={{ period }}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
            >
              {clientProgressCopy.detail.back}
            </Link>
          </section>
        ) : query.isPending ? (
          <section className="client-surface-card">
            <SectionSkeleton label={clientProgressCopy.loadingDetail} rows={3} />
          </section>
        ) : query.isError || !query.data ? (
          <section className="client-surface-card">
            {notFound ? (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  {errorStatus === 403
                    ? clientProgressCopy.detail.forbidden
                    : clientProgressCopy.detail.notFound}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {clientProgressCopy.detail.notFoundHint}
                </p>
                <Link
                  to="/client/progress"
                  search={{ period }}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
                >
                  {clientProgressCopy.detail.back}
                </Link>
              </div>
            ) : (
              <SectionError
                error={query.error}
                retrying={query.isFetching}
                onRetry={() => {
                  if (!query.isFetching) {
                    void query.refetch();
                  }
                }}
              />
            )}
          </section>
        ) : (
          <>
            {query.data.reps ? (
              <section className="client-surface-card space-y-5" aria-labelledby="reps-progress-heading">
                <h2
                  id="reps-progress-heading"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  {clientProgressCopy.detail.repsTitle}
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <PersonalBest
                    label={clientProgressCopy.detail.highestLoad}
                    value={
                      query.data.reps.bestLoadKg != null
                        ? formatKg(query.data.reps.bestLoadKg)
                        : null
                    }
                    record={query.data.reps.bestLoad}
                  />
                  <PersonalBest
                    label={clientProgressCopy.detail.highestReps}
                    value={
                      query.data.reps.bestReps != null
                        ? String(query.data.reps.bestReps)
                        : null
                    }
                    record={query.data.reps.bestRepsRecord}
                  />
                  <PersonalBest
                    label={clientProgressCopy.detail.estimated1Rm}
                    value={
                      query.data.reps.bestEstimated1RmKg != null
                        ? formatKg(query.data.reps.bestEstimated1RmKg)
                        : null
                    }
                    record={query.data.reps.bestEstimated1Rm}
                    hint={clientProgressCopy.detail.estimated1RmHint}
                  />
                </div>
                <LazyProgressChart
                  points={repsVolumePoints(query.data.reps.trend)}
                  label={clientProgressCopy.detail.volumeChart}
                  summary={clientProgressCopy.detail.volumeChart}
                />
                <LazyProgressChart
                  points={repsLoadPoints(query.data.reps.trend)}
                  label={clientProgressCopy.detail.loadChart}
                  summary={clientProgressCopy.detail.loadChart}
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {clientProgressCopy.detail.history}
                  </h3>
                  <div className="mt-3">
                    <ExerciseHistoryList sessions={query.data.reps.history.data} />
                  </div>
                </div>
              </section>
            ) : null}

            {query.data.duration ? (
              <section className="client-surface-card space-y-5" aria-labelledby="duration-progress-heading">
                <h2
                  id="duration-progress-heading"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  {clientProgressCopy.detail.durationTitle}
                </h2>
                <PersonalBest
                  label={clientProgressCopy.detail.highestDuration}
                  value={
                    query.data.duration.bestDurationSeconds != null
                      ? formatDurationSeconds(query.data.duration.bestDurationSeconds)
                      : null
                  }
                  record={query.data.duration.bestDuration}
                />
                <LazyProgressChart
                  points={durationTrendPoints(query.data.duration.trend)}
                  label={clientProgressCopy.detail.durationChart}
                  summary={clientProgressCopy.detail.durationChart}
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {clientProgressCopy.detail.history}
                  </h3>
                  <div className="mt-3">
                    <ExerciseHistoryList sessions={query.data.duration.history.data} />
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
