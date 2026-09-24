import { useExercisesGetById } from '@/generated/exercises/exercises';
import { useExerciseMediaList } from '@/generated/exercise-media/exercise-media';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { ExerciseMediaManager } from '@/features/trainer-workspace/components/exercise-media-manager';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { enumLabel } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { useNavigate } from '@tanstack/react-router';

export function TrainerExerciseDetailPage() {
  const copy = useTrainerWorkspaceCopy().exercises;
  const { user } = useAuthSession();
  const exerciseId = useTrainerRouteId('exerciseId');
  const navigate = useNavigate();
  const query = useExercisesGetById(exerciseId, {
    query: { enabled: Boolean(exerciseId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const mediaQuery = useExerciseMediaList(exerciseId, {
    query: { enabled: Boolean(exerciseId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });

  if (query.isPending) {
    return <TrainerPageSkeleton label={copy.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <PageContainer>
        <TrainerErrorState
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      </PageContainer>
    );
  }

  const exercise = query.data;
  const media = mediaQuery.data ?? [];
  const demoLabels = {
    play: copy.playDemonstration,
    pause: copy.pauseDemonstration,
    loading: copy.loadingLabel,
    empty: copy.mediaEmpty,
    failed: copy.mediaFailed,
    retry: copy.mediaRetry,
  };

  return (
    <PageContainer className="space-y-5">
      <Button variant="ghost" onClick={() => void navigate({ to: '/trainer/exercises' })}>
        {copy.title}
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
          <p className="text-sm text-muted-foreground">
            {enumLabel('muscle', exercise.primaryMuscleGroup)} · {enumLabel('equipment', exercise.equipmentType)} ·{' '}
            {enumLabel('difficulty', exercise.difficultyLevel)}
          </p>
        </div>
        <StatusBadge status={exercise.status} />
      </div>

      <ExerciseDemoPlayer
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        loadCatalogMedia
        variant="detail"
        playback="visible"
        labels={demoLabels}
      />

      <dl className="grid gap-3 sm:grid-cols-3">
        <Meta label={copy.muscle} value={enumLabel('muscle', exercise.primaryMuscleGroup)} />
        <Meta label={copy.equipment} value={enumLabel('equipment', exercise.equipmentType)} />
        <Meta label={copy.difficulty} value={enumLabel('difficulty', exercise.difficultyLevel)} />
      </dl>

      {exercise.description ? (
        <WorkspaceSurface>
          <h2 className="text-base font-semibold">{copy.descriptionLabel}</h2>
          <p className="mt-2 text-sm leading-relaxed">{exercise.description}</p>
        </WorkspaceSurface>
      ) : null}
      {exercise.instructions ? (
        <WorkspaceSurface>
          <h2 className="text-base font-semibold">{copy.instructions}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{exercise.instructions}</p>
        </WorkspaceSurface>
      ) : null}
      <WorkspaceSurface>
        <ExerciseMediaManager
          exercise={exercise}
          media={media}
          mediaPending={mediaQuery.isPending}
          userId={user?.id ?? null}
        />
      </WorkspaceSurface>
    </PageContainer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
