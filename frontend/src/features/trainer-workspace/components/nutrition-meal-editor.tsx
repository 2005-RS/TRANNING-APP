import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNutritionPlansReplaceMeals } from '@/generated/nutrition-plans/nutrition-plans';
import { NutritionPlanMealInputDtoMealType, type NutritionPlanResponseDto, type NutritionPlanMealInputDto, type NutritionPlanMealInputDtoNotes, type NutritionPlanMealItemInputDtoNotes } from '@/generated/models';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerNutrition } from '@/features/trainer-workspace/lib/invalidate';
import { NutritionFoodSearch } from './nutrition-food-search';
import { NativeSelect, TextArea, WorkspaceSurface } from './workspace-surface';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const portion = z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/).refine((value) => {
  const grams = Number(value.replace(',', '.'));
  return grams >= 0.01 && grams <= 100_000;
});
const mealsSchema = z.object({
  meals: z.array(z.object({
    key: z.string(), name: z.string().trim().min(2).max(150),
    mealType: z.nativeEnum(NutritionPlanMealInputDtoMealType),
    notes: z.string().max(1000),
    items: z.array(z.object({
      key: z.string(), foodId: z.string().uuid(), foodName: z.string(), quantity: portion, notes: z.string().max(1000),
    })).min(1).max(30),
  })).max(14),
});

type EditorValues = z.input<typeof mealsSchema>;

function initialValues(plan: NutritionPlanResponseDto): EditorValues {
  return { meals: plan.meals.map((meal) => ({
    key: meal.id, name: meal.name, mealType: meal.mealType, notes: meal.notes ?? '',
    items: meal.items.map((item) => ({
      key: item.id, foodId: item.foodId, foodName: item.foodName, quantity: String(item.quantityGrams), notes: item.notes ?? '',
    })),
  })) };
}

export function NutritionMealEditor({ plan, clientId, onDirtyChange }: {
  plan: NutritionPlanResponseDto; clientId: string; onDirtyChange: (dirty: boolean) => void;
}) {
  const copy = trainerWorkspaceCopy.nutrition;
  const queryClient = useQueryClient();
  const mutation = useNutritionPlansReplaceMeals();
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const markDirty = () => {
    setDirty(true);
    onDirtyChange(true);
  };
  const markClean = () => {
    setDirty(false);
    onDirtyChange(false);
  };
  const form = useForm({
    defaultValues: initialValues(plan),
    validators: { onSubmit: mealsSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const meals: NutritionPlanMealInputDto[] = value.meals.map((meal) => ({
        name: meal.name.trim(), mealType: meal.mealType,
        notes: asOpenApiField<NutritionPlanMealInputDtoNotes | undefined>(meal.notes.trim() || null),
        items: meal.items.map((item) => ({
          foodId: item.foodId, quantityGrams: Number(item.quantity.replace(',', '.')),
          notes: asOpenApiField<NutritionPlanMealItemInputDtoNotes | undefined>(item.notes.trim() || null),
        })),
      }));
      try {
        const saved = await mutation.mutateAsync({ clientId, planId: plan.id, data: { meals } });
        form.reset(initialValues(saved));
        markClean();
        setPicker(null);
        await invalidateTrainerNutrition(queryClient, clientId);
        toast.success(copy.saved);
      } catch (err) { setError(mapApiError(err).description); }
    },
  });

  return (
    <WorkspaceSurface>
      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
        <fieldset disabled={mutation.isPending} className="min-w-0 space-y-4">
          <div>
            <h3 className="text-base font-semibold">{copy.meals}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.mealLimit}</p>
          </div>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <form.Field name="meals" mode="array">
            {(field) => (
              <>
                {field.state.value.length === 0 ? <p className="text-sm text-muted-foreground">{copy.noMeals}</p> : null}
                <ol className="space-y-4">
                  {field.state.value.map((meal, index) => (
                    <li key={meal.key} className="min-w-0 space-y-4 rounded-md border border-border p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{index + 1}. {meal.name || copy.mealName}</span>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" disabled={index === 0} aria-label={`${copy.moveUp}: ${meal.name}`}
                            onClick={() => { field.swapValues(index, index - 1); markDirty(); }}>{copy.moveUp}</Button>
                          <Button type="button" variant="outline" disabled={index === field.state.value.length - 1} aria-label={`${copy.moveDown}: ${meal.name}`}
                            onClick={() => { field.swapValues(index, index + 1); markDirty(); }}>{copy.moveDown}</Button>
                          <Button type="button" variant="outline" aria-label={`${copy.removeMeal}: ${meal.name}`}
                            onClick={() => { field.removeValue(index); markDirty(); }}>{copy.removeMeal}</Button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <form.Field name={`meals[${index}].name`}>{(name) => (
                          <div className="space-y-1">
                            <Label htmlFor={`${meal.key}-name`}>{copy.mealName}</Label>
                            <Input id={`${meal.key}-name`} value={name.state.value} maxLength={150} required minLength={2}
                              onChange={(event) => { name.handleChange(event.target.value); markDirty(); }} />
                          </div>
                        )}</form.Field>
                        <form.Field name={`meals[${index}].mealType`}>{(type) => (
                          <div className="space-y-1">
                            <Label htmlFor={`${meal.key}-type`}>{copy.mealType}</Label>
                            <NativeSelect id={`${meal.key}-type`} value={type.state.value} onChange={(event) => {
                              type.handleChange(event.target.value as NutritionPlanMealInputDtoMealType); markDirty();
                            }}>
                              {Object.values(NutritionPlanMealInputDtoMealType).map((value) => <option key={value} value={value}>{trainerWorkspaceCopy.mealTypes[value]}</option>)}
                            </NativeSelect>
                          </div>
                        )}</form.Field>
                      </div>
                      <form.Field name={`meals[${index}].items`} mode="array">{(items) => (
                        <div className="space-y-3">
                          {!items.state.value.length ? <p className="text-sm text-muted-foreground">{copy.emptyMeal}</p> : null}
                          <ul className="space-y-3">
                            {items.state.value.map((item, itemIndex) => (
                              <li key={item.key} className="grid min-w-0 gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-medium">{item.foodName}</p>
                                  <form.Field name={`meals[${index}].items[${itemIndex}].notes`}>{(notes) => (
                                    <div className="mt-2 space-y-1">
                                      <Label htmlFor={`${item.key}-notes`}>{copy.notes}</Label>
                                      <Input id={`${item.key}-notes`} value={notes.state.value} maxLength={1000}
                                        onChange={(event) => { notes.handleChange(event.target.value); markDirty(); }} />
                                    </div>
                                  )}</form.Field>
                                </div>
                                <form.Field name={`meals[${index}].items[${itemIndex}].quantity`}>{(quantity) => (
                                  <div className="space-y-1">
                                    <Label htmlFor={`${item.key}-quantity`}>{copy.quantity}</Label>
                                    <Input id={`${item.key}-quantity`} inputMode="decimal" value={quantity.state.value} required
                                      aria-invalid={!portion.safeParse(quantity.state.value).success}
                                      onChange={(event) => { quantity.handleChange(event.target.value); markDirty(); }} />
                                  </div>
                                )}</form.Field>
                                <Button type="button" variant="outline" aria-label={`${copy.removeFood}: ${item.foodName}`}
                                  onClick={() => { items.removeValue(itemIndex); markDirty(); }}>{copy.removeFood}</Button>
                              </li>
                            ))}
                          </ul>
                          {picker === meal.key ? <NutritionFoodSearch onSelect={(food) => {
                            items.pushValue({ key: crypto.randomUUID(), foodId: food.id, foodName: food.name, quantity: '100', notes: '' });
                            markDirty(); setPicker(null);
                          }} /> : null}
                          <Button type="button" variant="outline" disabled={items.state.value.length >= 30}
                            onClick={() => setPicker(picker === meal.key ? null : meal.key)}>{picker === meal.key ? copy.closeFoodSearch : copy.chooseFood}</Button>
                        </div>
                      )}</form.Field>
                      <form.Field name={`meals[${index}].notes`}>{(notes) => (
                        <div className="space-y-1">
                          <Label htmlFor={`${meal.key}-notes`}>{copy.notes}</Label>
                          <TextArea id={`${meal.key}-notes`} value={notes.state.value} maxLength={1000}
                            onChange={(event) => { notes.handleChange(event.target.value); markDirty(); }} />
                        </div>
                      )}</form.Field>
                    </li>
                  ))}
                </ol>
                <Button type="button" variant="outline" disabled={field.state.value.length >= 14} onClick={() => {
                  field.pushValue({ key: crypto.randomUUID(), name: trainerWorkspaceCopy.mealTypes.OTHER, mealType: 'OTHER', notes: '', items: [] });
                  markDirty();
                }}>{copy.addMeal}</Button>
              </>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => [state.isSubmitting, state.submissionAttempts, state.values] as const}>
            {([submitting, attempts, values]) => (
              <div className="space-y-3 border-t border-border pt-4">
                {attempts > 0 && !mealsSchema.safeParse(values).success ? <Alert variant="danger">{copy.invalidMeals}</Alert> : null}
                <p role="status" className="text-sm text-muted-foreground">{dirty ? copy.unsaved : copy.saved}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!dirty || submitting}>{submitting ? trainerWorkspaceCopy.saving : copy.saveMeals}</Button>
                  <Button type="button" variant="outline" disabled={!dirty || submitting} onClick={() => {
                    form.reset(); setPicker(null); setError(null); markClean();
                  }}>{copy.discard}</Button>
                </div>
              </div>
            )}
          </form.Subscribe>
        </fieldset>
      </form>
    </WorkspaceSurface>
  );
}
