import { ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  ExerciseMediaResponseDto,
  WorkoutSessionExerciseResponseDto,
} from '@/generated/models';
import { WorkoutSessionPrescriptionResponseDtoType } from '@/generated/models';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { Button } from '@/shared/ui/button';
import { formatCompactNumber } from '@/features/client-dashboard/lib/formatters';
import { useWorkoutCopy } from '@/features/workout-session/copy';
import { formatPrescription } from '@/features/workout-session/lib/formatters';
import { cn } from '@/shared/lib/utils';

function demonstrationOf(
  exercise: WorkoutSessionExerciseResponseDto,
): ExerciseMediaResponseDto | null {
  return exercise.demonstrationMedia ?? null;
}

export function ExerciseFocus({
  exercise,
  index,
  total,
  onPrevious,
  onNext,
}: {
  exercise: WorkoutSessionExerciseResponseDto;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const workoutCopy = useWorkoutCopy();
  const duration =
    exercise.prescription.type === WorkoutSessionPrescriptionResponseDtoType.DURATION;
  const demonstration = demonstrationOf(exercise);
  const labels = {
    play: workoutCopy.focus.playDemonstration,
    pause: workoutCopy.focus.pauseDemonstration,
    loading: workoutCopy.focus.mediaLoading,
    empty: workoutCopy.focus.mediaEmpty,
    failed: workoutCopy.focus.mediaFailed,
    retry: workoutCopy.focus.mediaRetry,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-12 min-h-12 min-w-12"
          aria-label={workoutCopy.focus.previousExercise}
          disabled={index === 0}
          onClick={onPrevious}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <p className="text-sm font-medium text-muted-foreground">
          {workoutCopy.focus.exerciseOf(index + 1, total)}
        </p>
        <Button
          variant="outline"
          size="icon"
          className="size-12 min-h-12 min-w-12"
          aria-label={workoutCopy.focus.nextExercise}
          disabled={index >= total - 1}
          onClick={onNext}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
          {exercise.exerciseName}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {formatPrescription(exercise.prescription)}
        </p>
        <p className="text-sm text-muted-foreground">
          {workoutCopy.focus.recorded}{' '}
          <span className="text-numeric text-foreground">
            {formatCompactNumber(exercise.sets.length)} /{' '}
            {formatCompactNumber(exercise.prescription.sets)}
          </span>
        </p>
      </div>

      <ExerciseDemoPlayer
        exerciseId={exercise.exerciseId}
        exerciseName={exercise.exerciseName}
        media={demonstration}
        variant="focus"
        playback="current"
        labels={labels}
      />

      {exercise.prescription.notes ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {exercise.prescription.notes}
        </p>
      ) : null}

      {exercise.sets.length > 0 ? (
        <ol className="space-y-2">
          {exercise.sets.map((set) => (
            <li
              key={set.id}
              className={cn(
                'flex min-h-12 items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3',
              )}
            >
              <span className="text-sm text-muted-foreground">
                {workoutCopy.focus.recorded} {set.setNumber}
              </span>
              <span className="text-numeric text-base text-foreground">
                {duration
                  ? `${formatCompactNumber(set.actualDurationSeconds ?? 0)} sec`
                  : `${formatCompactNumber(set.actualReps ?? 0)} reps`}
                {' · '}
                {formatCompactNumber(set.actualLoadKg ?? 0)} kg
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
