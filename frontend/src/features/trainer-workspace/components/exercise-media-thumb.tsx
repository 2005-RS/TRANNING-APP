import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { cn } from '@/shared/lib/utils';

export function ExerciseMediaThumb({
  exerciseId,
  name,
  className,
}: {
  exerciseId: string;
  name: string;
  className?: string;
}) {
  const copy = useTrainerWorkspaceCopy().templates;
  return (
    <ExerciseDemoPlayer
      exerciseId={exerciseId}
      exerciseName={name}
      loadCatalogMedia
      variant="thumb"
      playback="manual"
      className={cn('size-14', className)}
      labels={{
        play: copy.playDemo,
        pause: copy.pauseDemo,
        loading: copy.mediaLoading,
        empty: copy.mediaEmpty,
        failed: copy.mediaFailed,
        retry: copy.mediaRetry,
      }}
    />
  );
}
