import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { WorkoutSessionExerciseResponseDto } from '@/generated/models';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { formatPrescription } from '@/features/workout-session/lib/formatters';
import { SetTable } from '@/features/workout-session/components/set-table';
import type { SetDraft } from '@/features/workout-session/lib/set-payload';
import { useWorkoutCopy } from '@/features/workout-session/copy';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function ExerciseAccordion({
  exercises,
  openIndex,
  pending,
  prSets,
  onOpen,
  onRecord,
  onUndo,
}: {
  exercises: WorkoutSessionExerciseResponseDto[];
  openIndex: number;
  pending: boolean;
  prSets: Record<string, Set<number>>;
  onOpen: (index: number) => void;
  onRecord: (exercise: WorkoutSessionExerciseResponseDto, draft: SetDraft) => void;
  onUndo: (exercise: WorkoutSessionExerciseResponseDto) => void;
}) {
  const workoutCopy = useWorkoutCopy();
  const [demonstrationExercise, setDemonstrationExercise] =
    useState<WorkoutSessionExerciseResponseDto | null>(null);
  const demonstrationLabels = {
    play: workoutCopy.focus.playDemonstration,
    pause: workoutCopy.focus.pauseDemonstration,
    loading: workoutCopy.focus.mediaLoading,
    empty: workoutCopy.focus.mediaEmpty,
    failed: workoutCopy.focus.mediaFailed,
    retry: workoutCopy.focus.mediaRetry,
  };

  return (
    <>
      <div className="space-y-2">
        {exercises.map((exercise, index) => {
          const open = index === openIndex;
          const complete = exercise.sets.length >= exercise.prescription.sets;

          return (
            <section
              key={exercise.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 px-3 text-left"
                aria-expanded={open}
                onClick={() => onOpen(index)}
              >
                <span className="text-numeric text-sm text-muted-foreground">
                  {exercise.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {exercise.exerciseName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatPrescription(exercise.prescription)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {complete
                    ? '✓'
                    : workoutCopy.focus.setProgress(
                        exercise.sets.length,
                        exercise.prescription.sets,
                      )}
                </span>
                <ChevronDown
                  className={
                    open
                      ? 'size-4 rotate-180 transition-transform duration-[var(--motion-fast)]'
                      : 'size-4 transition-transform duration-[var(--motion-fast)]'
                  }
                />
              </button>
              {open ? (
                <div className="space-y-3 border-t border-border p-3">
                  {exercise.demonstrationMedia ? (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2">
                      <ExerciseDemoPlayer
                        exerciseId={exercise.exerciseId}
                        exerciseName={exercise.exerciseName}
                        media={exercise.demonstrationMedia}
                        variant="thumb"
                        playback="visible"
                        labels={demonstrationLabels}
                        interactive={false}
                        className="size-[72px] shrink-0"
                      />
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setDemonstrationExercise(exercise)}
                      >
                        {workoutCopy.focus.viewDemonstration}
                      </Button>
                    </div>
                  ) : null}
                  <SetTable
                    exercise={exercise}
                    pending={pending}
                    prSetNumbers={prSets[exercise.id] ?? new Set()}
                    onRecord={(draft) => onRecord(exercise, draft)}
                    onUndo={() => onUndo(exercise)}
                  />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <Sheet
        open={demonstrationExercise !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDemonstrationExercise(null);
          }
        }}
      >
        <SheetContent side="bottom" className="mx-auto max-w-lg">
          {demonstrationExercise ? (
            <>
              <SheetHeader>
                <SheetTitle>{demonstrationExercise.exerciseName}</SheetTitle>
                <SheetDescription>
                  {workoutCopy.focus.viewDemonstration}
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 pt-2">
                <ExerciseDemoPlayer
                  exerciseId={demonstrationExercise.exerciseId}
                  exerciseName={demonstrationExercise.exerciseName}
                  media={demonstrationExercise.demonstrationMedia}
                  variant="focus"
                  playback="current"
                  labels={demonstrationLabels}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
