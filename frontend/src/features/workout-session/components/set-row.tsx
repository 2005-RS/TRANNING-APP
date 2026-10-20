import { Check, Trophy } from 'lucide-react';
import type { WorkoutSessionExerciseResponseDto } from '@/generated/models';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { SetDraft } from '@/features/workout-session/lib/set-payload';
import { setValueLabel } from '@/features/workout-session/lib/set-prefill';
import { workoutCopy } from '@/features/workout-session/copy';

export function SetRow({
  exercise,
  setNumber,
  draft,
  done,
  canRecord,
  isPr,
  pending,
  onChange,
  onRecord,
  onUndo,
}: {
  exercise: WorkoutSessionExerciseResponseDto;
  setNumber: number;
  draft: SetDraft;
  done: boolean;
  canRecord: boolean;
  isPr: boolean;
  pending: boolean;
  onChange: (next: SetDraft) => void;
  onRecord: () => void;
  onUndo: () => void;
}) {
  const duration = exercise.prescription.type === 'DURATION';
  const value = duration ? draft.actualDurationSeconds : draft.actualReps;
  const update = (key: keyof SetDraft, input: string) => {
    onChange({ ...draft, [key]: input === '' ? null : Number(input) });
  };
  const rowClassName = done
    ? [
        'grid grid-cols-[2rem_4rem_1fr_1fr_3rem] items-center gap-2 rounded-md',
        'bg-muted/50 px-2 py-2 text-muted-foreground',
      ].join(' ')
    : [
        'grid grid-cols-[2rem_4rem_1fr_1fr_3rem] items-center gap-2 rounded-md',
        'border border-border px-2 py-2',
      ].join(' ');

  return (
    <li className={rowClassName}>
      <span className="text-numeric text-sm">{setNumber}</span>
      <span className="text-numeric text-xs">
        {setValueLabel(exercise, setNumber)}
      </span>
      <Input
        aria-label={workoutCopy.focus.setLoadLabel(setNumber)}
        inputMode="decimal"
        className="min-h-11 px-2 text-center text-numeric"
        disabled={done || !canRecord}
        value={draft.actualLoadKg ?? ''}
        onChange={(event) => update('actualLoadKg', event.target.value)}
      />
      <Input
        aria-label={
          duration
            ? workoutCopy.focus.setDurationLabel(setNumber)
            : workoutCopy.focus.setRepsLabel(setNumber)
        }
        inputMode="numeric"
        className="min-h-11 px-2 text-center text-numeric"
        disabled={done || !canRecord}
        value={value ?? ''}
        onChange={(event) =>
          update(
            duration ? 'actualDurationSeconds' : 'actualReps',
            event.target.value,
          )
        }
      />
      {done ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-pressed
          aria-label={workoutCopy.focus.undoSet(setNumber)}
          disabled={!canRecord || pending}
          onClick={onUndo}
        >
          <Check className="size-5" />
        </Button>
      ) : (
        <Button
          size="icon"
          className="size-11"
          aria-pressed={false}
          aria-label={workoutCopy.focus.recordSet(setNumber)}
          disabled={!canRecord || pending}
          onClick={onRecord}
        >
          <Check className="size-5" />
        </Button>
      )}
      {isPr ? (
        <span className="col-span-5 flex items-center gap-1 text-xs font-medium text-primary">
          <Trophy className="size-3" />
          {workoutCopy.focus.personalRecord}
        </span>
      ) : null}
    </li>
  );
}
