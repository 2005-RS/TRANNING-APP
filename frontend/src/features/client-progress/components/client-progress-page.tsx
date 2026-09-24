import { useNavigate, useSearch } from '@tanstack/react-router';
import { BodyProgressSection } from '@/features/client-progress/components/body-progress-section';
import { ConsistencySection } from '@/features/client-progress/components/consistency-section';
import { ExerciseListSection } from '@/features/client-progress/components/exercise-list-section';
import { PerformanceOverview } from '@/features/client-progress/components/performance-overview';
import { PeriodSelector } from '@/features/client-progress/components/period-selector';
import { SectionError } from '@/features/client-progress/components/section-error';
import { SectionSkeleton } from '@/features/client-progress/components/section-skeleton';
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  usePreviousProgressSummary,
  useProgressBodyMeasurements,
  useProgressExercises,
  useProgressSummary,
} from '@/features/client-progress/hooks/use-client-progress';
import type { ProgressPeriod } from '@/features/client-progress/lib/period';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

export function ClientProgressPage() {
  const navigate = useNavigate({ from: '/client/progress' });
  const { period } = useSearch({ from: '/client/progress' });
  const summaryQuery = useProgressSummary(period);
  const previousQuery = usePreviousProgressSummary(period);
  const exercisesQuery = useProgressExercises(period);
  const bodyQuery = useProgressBodyMeasurements(period);

  function changePeriod(next: ProgressPeriod) {
    void navigate({
      search: { period: next },
      replace: true,
    });
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-5xl xl:max-w-6xl">
      <div className="flex flex-col gap-6 lg:gap-8">
        <PageHeader className="mb-0">
          <div className="space-y-2">
            <PageTitle>{clientProgressCopy.title}</PageTitle>
            <PageDescription>{clientProgressCopy.description}</PageDescription>
          </div>
        </PageHeader>

        <PeriodSelector period={period} onPeriodChange={changePeriod} />

        {summaryQuery.isPending ? (
          <section className="client-surface-card">
            <SectionSkeleton label={clientProgressCopy.loadingLabel} rows={2} />
          </section>
        ) : summaryQuery.isError || !summaryQuery.data ? (
          <section className="client-surface-card">
            <SectionError
              error={summaryQuery.error}
              retrying={summaryQuery.isFetching}
              onRetry={() => {
                if (!summaryQuery.isFetching) {
                  void summaryQuery.refetch();
                }
              }}
            />
          </section>
        ) : (
          <>
            <PerformanceOverview
              current={summaryQuery.data}
              previous={previousQuery.data}
            />
            <ConsistencySection current={summaryQuery.data} />
          </>
        )}

        {bodyQuery.isPending ? (
          <section className="client-surface-card">
            <SectionSkeleton label={clientProgressCopy.loadingBody} rows={1} />
          </section>
        ) : bodyQuery.isError ? (
          <section className="client-surface-card">
            <SectionError
              title={clientProgressCopy.body.title}
              error={bodyQuery.error}
              retrying={bodyQuery.isFetching}
              onRetry={() => {
                if (!bodyQuery.isFetching) {
                  void bodyQuery.refetch();
                }
              }}
            />
          </section>
        ) : (
          <BodyProgressSection measurements={bodyQuery.data?.data ?? []} />
        )}

        {exercisesQuery.isPending ? (
          <section className="client-surface-card">
            <SectionSkeleton label={clientProgressCopy.loadingExercises} rows={3} />
          </section>
        ) : exercisesQuery.isError ? (
          <section className="client-surface-card">
            <SectionError
              title={clientProgressCopy.exercises.title}
              error={exercisesQuery.error}
              retrying={exercisesQuery.isFetching}
              onRetry={() => {
                if (!exercisesQuery.isFetching) {
                  void exercisesQuery.refetch();
                }
              }}
            />
          </section>
        ) : (
          <ExerciseListSection
            items={exercisesQuery.data?.data ?? []}
            totalItems={exercisesQuery.data?.meta.totalItems ?? 0}
            period={period}
          />
        )}
      </div>
    </PageContainer>
  );
}
