import { useState, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
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
import { NativeSelect, TextArea } from './workspace-surface';
import { trainerWorkspaceCopy } from '../copy';

/** Shared editable fields of training and nutrition plans (dates as local `YYYY-MM-DD`). */
export type PlanBaseValues = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

export type NutritionTargetKey =
  | 'targetCaloriesKcal'
  | 'targetProteinG'
  | 'targetCarbohydratesG'
  | 'targetFatG';

export type NutritionPlanEditValues = PlanBaseValues & Record<NutritionTargetKey, string>;

type SaveFailure = (message: string) => void;

const MIN_NAME_LENGTH = 2;
const TARGET_KEYS: readonly NutritionTargetKey[] = [
  'targetCaloriesKcal',
  'targetProteinG',
  'targetCarbohydratesG',
  'targetFatG',
];

/** Empty, or a non-negative number with up to two decimals. */
function isValidTarget(value: string): boolean {
  if (value === '') {
    return true;
  }
  return /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) && Number(value) <= 999_999.99;
}

function endsBeforeStart(values: PlanBaseValues): boolean {
  return Boolean(values.startDate && values.endDate && values.endDate < values.startDate);
}

function EditSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={trainerWorkspaceCopy.templates.close}
        className="w-[min(28rem,90vw)] bg-background p-0"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{trainerWorkspaceCopy.editDescription}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

function EditForm({
  children,
  error,
  pending,
  onSubmit,
}: {
  children: ReactNode;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {error ? (
          <Alert variant="danger">
            <div className="flex gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          </Alert>
        ) : null}
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="submit" disabled={pending}>
          {pending ? trainerWorkspaceCopy.saving : trainerWorkspaceCopy.save}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  inputMode?: 'decimal';
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <TextArea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function PlanFields({
  values,
  onChange,
}: {
  values: PlanBaseValues;
  onChange: (partial: Partial<PlanBaseValues>) => void;
}) {
  const copy = trainerWorkspaceCopy.training;
  return (
    <>
      <TextField
        id="edit-plan-name"
        label={copy.name}
        value={values.name}
        onChange={(name) => onChange({ name })}
      />
      <TextAreaField
        id="edit-plan-description"
        label={copy.descriptionLabel}
        value={values.description}
        onChange={(description) => onChange({ description })}
      />
      <TextField
        id="edit-plan-start-date"
        type="date"
        label={copy.startDate}
        value={values.startDate}
        onChange={(startDate) => onChange({ startDate })}
      />
      <TextField
        id="edit-plan-end-date"
        type="date"
        label={copy.endDate}
        value={values.endDate}
        onChange={(endDate) => onChange({ endDate })}
      />
    </>
  );
}

export function TemplateEditSheet({
  open,
  onOpenChange,
  name,
  description,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string | null | undefined;
  pending: boolean;
  onSave: (data: { name: string; description: string | null }, fail: SaveFailure) => Promise<void>;
}) {
  const copy = trainerWorkspaceCopy.templates;
  const [values, setValues] = useState({ name, description: description ?? '' });
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmedName = values.name.trim();
    if (trimmedName.length < MIN_NAME_LENGTH) {
      setError(copy.nameRequired);
      return;
    }
    setError(null);
    void onSave({ name: trimmedName, description: values.description.trim() || null }, setError);
  }

  return (
    <EditSheet open={open} onOpenChange={onOpenChange} title={copy.editTitle}>
      <EditForm error={error} pending={pending} onSubmit={submit}>
        <TextField
          id="edit-template-name"
          label={copy.name}
          value={values.name}
          onChange={(next) => setValues({ ...values, name: next })}
        />
        <TextAreaField
          id="edit-template-description"
          label={copy.descriptionLabel}
          value={values.description}
          onChange={(next) => setValues({ ...values, description: next })}
        />
      </EditForm>
    </EditSheet>
  );
}

export function TrainingPlanEditSheet({
  open,
  onOpenChange,
  values: initialValues,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: PlanBaseValues;
  pending: boolean;
  onSave: (data: PlanBaseValues, fail: SaveFailure) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (values.name.trim().length < MIN_NAME_LENGTH) {
      setError(trainerWorkspaceCopy.training.nameRequired);
      return;
    }
    if (endsBeforeStart(values)) {
      setError(trainerWorkspaceCopy.endBeforeStart);
      return;
    }
    setError(null);
    void onSave({ ...values, name: values.name.trim() }, setError);
  }

  return (
    <EditSheet open={open} onOpenChange={onOpenChange} title={trainerWorkspaceCopy.training.editPlan}>
      <EditForm error={error} pending={pending} onSubmit={submit}>
        <PlanFields values={values} onChange={(partial) => setValues({ ...values, ...partial })} />
      </EditForm>
    </EditSheet>
  );
}

export function WorkoutEditSheet({
  open,
  onOpenChange,
  scheduledDay,
  notes,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledDay: string | null | undefined;
  notes: string | null | undefined;
  pending: boolean;
  onSave: (data: { scheduledDay: string | null; notes: string | null }, fail: SaveFailure) => Promise<void>;
}) {
  const copy = trainerWorkspaceCopy.training;
  const [day, setDay] = useState(scheduledDay ?? '');
  const [draftNotes, setDraftNotes] = useState(notes ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <EditSheet open={open} onOpenChange={onOpenChange} title={copy.editWorkout}>
      <EditForm
        error={error}
        pending={pending}
        onSubmit={() => {
          setError(null);
          void onSave({ scheduledDay: day || null, notes: draftNotes.trim() || null }, setError);
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="edit-workout-day">{copy.scheduledDay}</Label>
          <NativeSelect id="edit-workout-day" value={day} onChange={(event) => setDay(event.target.value)}>
            <option value="">{copy.unscheduled}</option>
            {Object.entries(trainerWorkspaceCopy.days).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <TextAreaField
          id="edit-workout-notes"
          label={copy.notes}
          value={draftNotes}
          onChange={setDraftNotes}
        />
      </EditForm>
    </EditSheet>
  );
}

export function NutritionPlanEditSheet({
  open,
  onOpenChange,
  values: initialValues,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: NutritionPlanEditValues;
  pending: boolean;
  onSave: (data: NutritionPlanEditValues, fail: SaveFailure) => Promise<void>;
}) {
  const nutritionCopy = trainerWorkspaceCopy.nutrition;
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const targetLabels: Record<NutritionTargetKey, string> = {
    targetCaloriesKcal: nutritionCopy.calories,
    targetProteinG: nutritionCopy.protein,
    targetCarbohydratesG: nutritionCopy.carbs,
    targetFatG: nutritionCopy.fat,
  };

  function submit() {
    if (values.name.trim().length < MIN_NAME_LENGTH) {
      setError(trainerWorkspaceCopy.training.nameRequired);
      return;
    }
    if (endsBeforeStart(values)) {
      setError(trainerWorkspaceCopy.endBeforeStart);
      return;
    }
    if (TARGET_KEYS.some((key) => !isValidTarget(values[key]))) {
      setError(trainerWorkspaceCopy.checkFields);
      return;
    }
    setError(null);
    void onSave({ ...values, name: values.name.trim() }, setError);
  }

  return (
    <EditSheet open={open} onOpenChange={onOpenChange} title={nutritionCopy.editPlan}>
      <EditForm error={error} pending={pending} onSubmit={submit}>
        <PlanFields values={values} onChange={(partial) => setValues({ ...values, ...partial })} />
        {TARGET_KEYS.map((key) => (
          <TextField
            key={key}
            id={`edit-nutrition-${key}`}
            label={targetLabels[key]}
            inputMode="decimal"
            value={values[key]}
            onChange={(next) => setValues({ ...values, [key]: next })}
          />
        ))}
      </EditForm>
    </EditSheet>
  );
}
