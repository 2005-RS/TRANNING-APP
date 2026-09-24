import { useId, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import {
  WorkoutTemplateExerciseInputDtoPrescriptionType,
  type WorkoutTemplateExerciseInputDto,
  type WorkoutTemplateExerciseResponseDto,
} from '@/generated/models';
import { ExerciseMediaThumb } from '@/features/trainer-workspace/components/exercise-media-thumb';
import { ExercisePicker } from '@/features/trainer-workspace/components/exercise-picker';
import { NativeSelect, TextArea } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import {
  defaultPrescriptionDraft,
  draftFromItem,
  draftToInput,
  type IntensityKind,
  type PrescriptionDraft,
} from '@/features/trainer-workspace/lib/prescription';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.templates;
const training = trainerWorkspaceCopy.training;

export type PrescriptionSheetMode =
  | { kind: 'add' }
  | { kind: 'edit'; item: WorkoutTemplateExerciseResponseDto };

export function PrescriptionSheet({
  open,
  mode,
  canRemove,
  onOpenChange,
  onSave,
  onRemove,
}: {
  open: boolean;
  mode: PrescriptionSheetMode | null;
  canRemove: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: WorkoutTemplateExerciseInputDto) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={copy.close}
        className="w-[min(28rem,90vw)] bg-background p-0"
      >
        {mode ? (
          <PrescriptionSheetBody
            key={mode.kind === 'add' ? 'add' : mode.item.id}
            mode={mode}
            canRemove={canRemove}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onRemove={onRemove}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PrescriptionSheetBody({
  mode,
  canRemove,
  onOpenChange,
  onSave,
  onRemove,
}: {
  mode: PrescriptionSheetMode;
  canRemove: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: WorkoutTemplateExerciseInputDto) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const formErrorId = useId();
  const [exercise, setExercise] = useState<{ id: string; name: string } | null>(
    mode.kind === 'edit' ? { id: mode.item.exercise.id, name: mode.item.exercise.name } : null,
  );
  const [draft, setDraft] = useState<PrescriptionDraft>(
    mode.kind === 'edit' ? draftFromItem(mode.item) : defaultPrescriptionDraft(),
  );
  const [picking, setPicking] = useState(mode.kind === 'add');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!exercise) {
      return;
    }
    setFormError(null);
    try {
      const input = draftToInput(exercise.id, draft);
      setPending(true);
      await onSave(input);
      onOpenChange(false);
    } catch (err) {
      setFormError(prescriptionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const title = mode.kind === 'add' ? copy.addExercise : `${copy.editExercise} ${mode.item.exercise.name}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {mode.kind === 'add' ? copy.pickExerciseBody : copy.prescriptionTitle}
        </SheetDescription>
      </SheetHeader>
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        aria-describedby={formError ? formErrorId : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void submit();
        }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {formError ? (
            <Alert variant="danger" id={formErrorId}>
              <div className="flex gap-2">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>{formError}</p>
              </div>
            </Alert>
          ) : null}
          {mode.kind === 'add' && picking ? (
            <ExercisePicker
              selectedId={exercise?.id ?? null}
              onSelect={(next) => {
                setExercise({ id: next.id, name: next.name });
                setPicking(false);
              }}
            />
          ) : null}
          {exercise && !picking ? (
            <>
              <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <ExerciseMediaThumb
                  exerciseId={exercise.id}
                  name={exercise.name}
                  className="size-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground">{copy.prescriptionTitle}</p>
                </div>
                {mode.kind === 'add' ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(true)}>
                    {copy.changeExercise}
                  </Button>
                ) : null}
              </div>
              <PrescriptionFields draft={draft} onChange={setDraft} invalid={Boolean(formError)} />
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          {mode.kind === 'edit' && canRemove && onRemove ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto"
              disabled={pending}
              onClick={() => {
                void onRemove();
              }}
            >
              {copy.removeExercise}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={!exercise || pending}>
            {pending
              ? trainerWorkspaceCopy.saving
              : mode.kind === 'add'
                ? copy.addExercise
                : copy.savePrescription}
          </Button>
        </div>
      </form>
    </div>
  );
}

function prescriptionErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    switch (err.message) {
      case 'Invalid prescription':
        return copy.invalidPrescription;
      case 'Invalid duration':
        return copy.invalidDuration;
      case 'Invalid reps':
        return copy.invalidReps;
      case 'Invalid RPE':
        return copy.invalidRpe;
      case 'Invalid RIR':
        return copy.invalidRir;
      default:
        break;
    }
  }
  return mapApiError(err).description;
}

function PrescriptionFields({
  draft,
  onChange,
  invalid,
}: {
  draft: PrescriptionDraft;
  onChange: (next: PrescriptionDraft) => void;
  invalid: boolean;
}) {
  function patch(partial: Partial<PrescriptionDraft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={training.sets} htmlFor="rx-sets">
        <Input
          id="rx-sets"
          inputMode="numeric"
          className="font-mono"
          value={draft.sets}
          onChange={(event) => patch({ sets: event.target.value })}
          aria-invalid={invalid}
          required
        />
      </Field>
      <Field label={copy.prescriptionType} htmlFor="rx-type">
        <NativeSelect
          id="rx-type"
          value={draft.prescriptionType}
          onChange={(event) =>
            patch({
              prescriptionType: event.target.value as WorkoutTemplateExerciseInputDtoPrescriptionType,
            })
          }
        >
          <option value={WorkoutTemplateExerciseInputDtoPrescriptionType.REPS}>{copy.repsType}</option>
          <option value={WorkoutTemplateExerciseInputDtoPrescriptionType.DURATION}>
            {copy.durationType}
          </option>
        </NativeSelect>
      </Field>
      {draft.prescriptionType === WorkoutTemplateExerciseInputDtoPrescriptionType.DURATION ? (
        <Field label={copy.duration} htmlFor="rx-duration" className="sm:col-span-2">
          <Input
            id="rx-duration"
            inputMode="numeric"
            className="font-mono"
            value={draft.durationSeconds}
            onChange={(event) => patch({ durationSeconds: event.target.value })}
            aria-invalid={invalid}
            aria-describedby="rx-duration-hint"
          />
          <p id="rx-duration-hint" className="text-xs text-muted-foreground">
            {copy.durationHint}
          </p>
        </Field>
      ) : (
        <>
          <Field label={copy.repsMin} htmlFor="rx-reps-min">
            <Input
              id="rx-reps-min"
              inputMode="numeric"
              className="font-mono"
              value={draft.repsMin}
              onChange={(event) => patch({ repsMin: event.target.value })}
              aria-invalid={invalid}
            />
          </Field>
          <Field label={copy.repsMax} htmlFor="rx-reps-max">
            <Input
              id="rx-reps-max"
              inputMode="numeric"
              className="font-mono"
              value={draft.repsMax}
              onChange={(event) => patch({ repsMax: event.target.value })}
              aria-invalid={invalid}
            />
          </Field>
        </>
      )}
      <Field label={copy.rest} htmlFor="rx-rest" className="sm:col-span-2">
        <Input
          id="rx-rest"
          inputMode="numeric"
          className="font-mono"
          value={draft.restSeconds}
          onChange={(event) => patch({ restSeconds: event.target.value })}
          aria-invalid={invalid}
          aria-describedby="rx-rest-hint"
        />
        <p id="rx-rest-hint" className="text-xs text-muted-foreground">
          {copy.restHint}
        </p>
      </Field>
      <Field label={copy.intensity} htmlFor="rx-intensity">
        <NativeSelect
          id="rx-intensity"
          value={draft.intensity}
          onChange={(event) => patch({ intensity: event.target.value as IntensityKind })}
        >
          <option value="none">{copy.intensityNone}</option>
          <option value="rpe">{training.rpe}</option>
          <option value="rir">{training.rir}</option>
        </NativeSelect>
      </Field>
      {draft.intensity === 'rpe' ? (
        <Field label={training.rpe} htmlFor="rx-rpe">
          <Input
            id="rx-rpe"
            inputMode="decimal"
            className="font-mono"
            value={draft.targetRpe}
            onChange={(event) => patch({ targetRpe: event.target.value })}
          />
        </Field>
      ) : draft.intensity === 'rir' ? (
        <Field label={training.rir} htmlFor="rx-rir">
          <Input
            id="rx-rir"
            inputMode="numeric"
            className="font-mono"
            value={draft.targetRir}
            onChange={(event) => patch({ targetRir: event.target.value })}
          />
        </Field>
      ) : (
        <div />
      )}
      <Field label={training.tempo} htmlFor="rx-tempo" className="sm:col-span-2">
        <Input
          id="rx-tempo"
          value={draft.tempo}
          maxLength={20}
          onChange={(event) => patch({ tempo: event.target.value })}
        />
      </Field>
      <Field label={training.notes} htmlFor="rx-notes" className="sm:col-span-2">
        <TextArea
          id="rx-notes"
          rows={3}
          value={draft.notes}
          maxLength={1000}
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
