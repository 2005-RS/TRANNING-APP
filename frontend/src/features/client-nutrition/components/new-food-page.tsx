import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useClientNutritionFoodsCreate } from '@/generated/client-nutrition-foods/client-nutrition-foods';
import { JournalFlowHeader } from '@/features/client-nutrition/components/journal-flow-header';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { invalidateJournal } from '@/features/client-nutrition/hooks/use-nutrition-journal';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer } from '@/shared/ui/page';

type Field =
  | 'name'
  | 'brand'
  | 'portionLabel'
  | 'portionGrams'
  | 'caloriesKcal'
  | 'proteinG'
  | 'carbohydratesG'
  | 'fatG'
  | 'fiberG';

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

/** U2: the Client's own food (PRIVATE), entered as printed on the label, per portion. */
export function NewFoodPage() {
  const copy = useClientNutritionCopy();
  const params = useSearch({ from: '/client/nutrition/foods/new' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useClientNutritionFoodsCreate();
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    brand: '',
    portionLabel: '',
    portionGrams: '100',
    caloriesKcal: '',
    proteinG: '',
    carbohydratesG: '',
    fatG: '',
    fiberG: '',
  });
  const [invalid, setInvalid] = useState(false);

  const set = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = () => {
    const portionGrams = toNumber(values.portionGrams);
    const required = [values.caloriesKcal, values.proteinG, values.carbohydratesG, values.fatG].map(
      toNumber,
    );
    const fiber = toNumber(values.fiberG);
    const ok =
      values.name.trim().length >= 2 &&
      portionGrams !== null &&
      portionGrams > 0 &&
      required.every((value) => value !== null && !Number.isNaN(value)) &&
      !Number.isNaN(fiber);
    setInvalid(!ok);
    if (!ok) return;

    create.mutate(
      {
        data: {
          name: values.name.trim(),
          brand: values.brand.trim() || null,
          portionLabel: values.portionLabel.trim() || undefined,
          portionGrams: portionGrams!,
          caloriesKcal: required[0]!,
          proteinG: required[1]!,
          carbohydratesG: required[2]!,
          fatG: required[3]!,
          fiberG: fiber,
        },
      },
      {
        onSuccess: (food) => {
          void invalidateJournal(queryClient);
          void navigate({
            to: '/client/nutrition/foods/$foodId',
            params: { foodId: food.id },
            search: { date: params.date, meal: params.meal },
            replace: true,
          });
        },
      },
    );
  };

  const field = (name: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`new-food-${name}`}>{label}</Label>
      <Input
        id={`new-food-${name}`}
        value={values[name]}
        onChange={set(name)}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  );
  const numeric = { inputMode: 'decimal' as const, className: 'text-numeric' };

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <JournalFlowHeader date={params.date} title={copy.newFood.title} />
      <p className="mb-5 text-sm text-muted-foreground">{copy.newFood.description}</p>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="client-surface-card space-y-4">
          {field('name', copy.newFood.name, { autoComplete: 'off', maxLength: 150 })}
          {field('brand', copy.newFood.brand, { autoComplete: 'off', maxLength: 150 })}
        </div>
        <div className="client-surface-card grid grid-cols-2 gap-4">
          {field('portionLabel', copy.newFood.portionLabel, {
            placeholder: copy.newFood.portionLabelPlaceholder,
            maxLength: 60,
          })}
          {field('portionGrams', copy.newFood.portionGrams, numeric)}
        </div>
        <div className="client-surface-card grid grid-cols-2 gap-4">
          {field('caloriesKcal', copy.newFood.calories, numeric)}
          {field('proteinG', copy.newFood.protein, numeric)}
          {field('carbohydratesG', copy.newFood.carbs, numeric)}
          {field('fatG', copy.newFood.fat, numeric)}
          {field('fiberG', copy.newFood.fiber, numeric)}
        </div>
        {invalid ? <Alert variant="danger">{copy.newFood.invalid}</Alert> : null}
        {create.isError ? (
          <Alert variant="danger">{mapApiError(create.error).description}</Alert>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
          {create.isPending ? copy.newFood.saving : copy.newFood.save}
        </Button>
      </form>
    </PageContainer>
  );
}
