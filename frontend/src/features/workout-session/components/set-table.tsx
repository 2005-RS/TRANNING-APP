import { useEffect, useState } from 'react';
import type { WorkoutSessionExerciseResponseDto } from '@/generated/models';
import type { SetDraft } from '@/features/workout-session/lib/set-payload';
import { prefillSetDraft } from '@/features/workout-session/lib/set-prefill';
import { SetRow } from '@/features/workout-session/components/set-row';
import { workoutCopy } from '@/features/workout-session/copy';

export function SetTable({
  exercise,
  pending,
  prSetNumbers,
  onRecord,
  onUndo,
}: {
  exercise: WorkoutSessionExerciseResponseDto;
  pending: boolean;
  prSetNumbers: Set<number>;
  onRecord: (draft: SetDraft) => void;
  onUndo: () => void;
}) {
  const [extra, setExtra] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, SetDraft>>({});

  useEffect(() => {
    setExtra(0);
    setDrafts({});
  }, [exercise.id]);

  const count = Math.max(exercise.prescription.sets, exercise.sets.length) + extra;
  const lastRecorded = exercise.sets.length;

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-[2rem_4rem_1fr_1fr_3rem] gap-2 px-2 text-xs font-medium text-muted-foreground">
        <span>#</span>
        <span>{workoutCopy.focus.previous}</span>
        <span>kg</span>
        <span>
          {exercise.prescription.type === 'DURATION'
            ? 's'
            : workoutCopy.focus.repsShort}
        </span>
        <span>✓</span>
      </div>
      <ol className="space-y-2">
        {Array.from({ length: count }, (_, index) => {
          const setNumber = index + 1;
          const done = setNumber <= lastRecorded;
          const draft =
            drafts[setNumber] ?? prefillSetDraft(exercise, setNumber);

          return (
            <SetRow
              key={setNumber}
              exercise={exercise}
              setNumber={setNumber}
              draft={draft}
              done={done}
              canRecord={
                done ? setNumber === lastRecorded : setNumber === lastRecorded + 1
              }
              isPr={prSetNumbers.has(setNumber)}
              pending={pending}
              onChange={(next) =>
                setDrafts((current) => ({ ...current, [setNumber]: next }))
              }
              onRecord={() => onRecord(draft)}
              onUndo={onUndo}
            />
          );
        })}
      </ol>
      <button
        type="button"
        className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => setExtra((value) => value + 1)}
      >
        {workoutCopy.focus.addExtraSet}
      </button>
    </section>
  );
}
