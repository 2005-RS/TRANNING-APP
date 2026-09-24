import { Minus, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { workoutCopy } from '@/features/workout-session/copy';
import { stepValue, type SetDraft } from '@/features/workout-session/lib/set-payload';

function NumericStepper({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-12 min-h-12 min-w-12 shrink-0"
          aria-label={workoutCopy.focus.decrease(label)}
          onClick={() => onChange(stepValue(value, -step))}
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <Input
          id={id}
          inputMode="decimal"
          className="text-numeric h-12 min-h-12 min-w-0 flex-1 text-center text-lg font-medium"
          autoComplete="off"
          value={String(value)}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (event.target.value === '') {
              onChange(0);
              return;
            }
            if (Number.isFinite(parsed)) {
              onChange(Math.max(0, parsed));
            }
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="size-12 min-h-12 min-w-12 shrink-0"
          aria-label={workoutCopy.focus.increase(label)}
          onClick={() => onChange(stepValue(value, step))}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function SetLogger({
  draft,
  durationExercise,
  pending,
  onChange,
  onLog,
}: {
  draft: SetDraft;
  durationExercise: boolean;
  pending: boolean;
  onChange: (draft: SetDraft) => void;
  onLog: () => void;
}) {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) {
          onLog();
        }
      }}
    >
      <NumericStepper
        id="set-load"
        label={workoutCopy.focus.load}
        value={draft.actualLoadKg}
        step={2.5}
        onChange={(actualLoadKg) => onChange({ ...draft, actualLoadKg })}
      />
      {durationExercise ? (
        <NumericStepper
          id="set-duration"
          label={workoutCopy.focus.duration}
          value={draft.actualDurationSeconds}
          step={5}
          onChange={(actualDurationSeconds) =>
            onChange({ ...draft, actualDurationSeconds })
          }
        />
      ) : (
        <NumericStepper
          id="set-reps"
          label={workoutCopy.focus.reps}
          value={draft.actualReps}
          step={1}
          onChange={(actualReps) => onChange({ ...draft, actualReps })}
        />
      )}
      <Button type="submit" className="min-h-14 w-full text-base" disabled={pending}>
        {pending ? workoutCopy.focus.loggingSet : workoutCopy.focus.logSet}
      </Button>
    </form>
  );
}
