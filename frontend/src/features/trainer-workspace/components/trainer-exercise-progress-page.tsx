import { useNavigate, useSearch } from '@tanstack/react-router';
import { useProgressGetExercise } from '@/generated/progress/progress';
import { LazyProgressChart } from '@/features/client-progress/charts/lazy-progress-chart';
import { durationTrendPoints, repsLoadPoints, repsVolumePoints } from '@/features/client-progress/lib/chart-points';
import { DEFAULT_PROGRESS_PERIOD, windowForPeriod } from '@/features/client-progress/lib/period';
import { formatDurationSeconds, formatKg } from '@/features/client-progress/lib/formatters';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId, useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { Button } from '@/shared/ui/button';

const copy = trainerWorkspaceCopy.progress;

export function TrainerExerciseProgressPage() {
  const clientId = useTrainerClientId();
  const exerciseId = useTrainerRouteId('exerciseId');
  const navigate = useNavigate({ from: '/trainer/clients/$clientId/progress/exercises/$exerciseId' });
  const search = useSearch({ from: '/trainer/clients/$clientId/progress/exercises/$exerciseId' });
  const period = search.period ?? DEFAULT_PROGRESS_PERIOD;
  const window = windowForPeriod(period);
  const query = useProgressGetExercise(clientId, exerciseId, window, {
    query: {
      enabled: Boolean(clientId && exerciseId),
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });

  if (query.isPending) {
    return (
      <WorkspaceSurface>
        <TrainerSectionSkeleton label={copy.loadingLabel} />
      </WorkspaceSurface>
    );
  }
  if (query.isError || !query.data) {
    return (
      <TrainerErrorState
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  const detail = query.data;
  const volumePoints = detail.reps ? repsVolumePoints(detail.reps.trend) : [];
  const loadPoints = detail.reps ? repsLoadPoints(detail.reps.trend) : [];
  const durationPoints = detail.duration ? durationTrendPoints(detail.duration.trend) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{detail.exerciseName}</h2>
          <p className="text-sm text-muted-foreground">{copy.title}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void navigate({
              to: '/trainer/clients/$clientId/progress',
              params: { clientId },
              search: { period },
            });
          }}
        >
          {trainerWorkspaceCopy.workspace.progress}
        </Button>
      </div>
      {detail.reps ? (
        <WorkspaceSurface>
          <p className="text-sm text-muted-foreground">{copy.volume}</p>
          <p className="mt-1 font-mono text-xl tabular-nums">{formatKg(detail.reps.externalLoadVolumeKg)}</p>
          <LazyProgressChart points={volumePoints} label={copy.volume} summary={copy.volume} />
          <LazyProgressChart points={loadPoints} label={copy.volume} summary={copy.volume} />
        </WorkspaceSurface>
      ) : null}
      {detail.duration ? (
        <WorkspaceSurface>
          <p className="text-sm text-muted-foreground">{copy.duration}</p>
          <p className="mt-1 font-mono text-xl tabular-nums">
            {formatDurationSeconds(detail.duration.totalDurationSeconds)}
          </p>
          <LazyProgressChart points={durationPoints} label={copy.duration} summary={copy.duration} />
        </WorkspaceSurface>
      ) : null}
    </div>
  );
}
