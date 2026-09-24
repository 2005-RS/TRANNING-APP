import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateNutritionFoodDto,
  CreateNutritionFoodDtoBrand,
  CreateNutritionFoodDtoFiberGPer100g,
} from '@/generated/models';
import { useNutritionFoodsCreate, useNutritionFoodsList } from '@/generated/nutrition-foods/nutrition-foods';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { PaginationBar } from '@/features/trainer-workspace/components/pagination-bar';
import { TrainerEmptyState, TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { parseDecimalInput } from '@/features/trainer-workspace/lib/finite-number';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { formatGrams, formatKcal } from '@/features/trainer-workspace/lib/formatters';
import { invalidateTrainerFoods } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { foodSchema } from '@/features/trainer-workspace/schemas/plan-schemas';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { useNavigate, useSearch } from '@tanstack/react-router';

const copy = trainerWorkspaceCopy.foods;

export function TrainerFoodsPage() {
  const navigate = useNavigate({ from: '/trainer/nutrition' });
  const search = useSearch({ from: '/trainer/nutrition' });
  const [draft, setDraft] = useState(search.search ?? '');
  const query = useNutritionFoodsList(
    { page: search.page ?? 1, limit: TRAINER_LIST_PAGE_SIZE, search: search.search },
    { query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );

  if (query.isPending) {
    return <TrainerPageSkeleton label={copy.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <TrainerPageError
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader className="mb-0">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.description}</PageDescription>
        </div>
      </PageHeader>
      <CreateFoodForm />
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ search: { ...search, search: draft.trim() || undefined, page: 1 }, replace: true });
        }}
      >
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={copy.name} />
        <Button type="submit">{trainerWorkspaceCopy.search}</Button>
      </form>
      {query.data.data.length === 0 ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <>
          <WorkspaceSurface className="overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{copy.name}</th>
                  <th className="px-4 py-3 font-medium">{copy.brand}</th>
                  <th className="px-4 py-3 font-medium">{copy.per100}</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((food) => (
                  <tr key={food.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{food.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{food.brand ?? trainerWorkspaceCopy.notSet}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {formatKcal(food.nutritionPer100g.caloriesKcal)} · {formatGrams(food.nutritionPer100g.proteinG)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={food.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceSurface>
          <PaginationBar
            meta={query.data.meta}
            onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
          />
        </>
      )}
    </PageContainer>
  );
}

function CreateFoodForm() {
  const queryClient = useQueryClient();
  const create = useNutritionFoodsCreate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      name: '',
      brand: '',
      caloriesPer100g: '',
      proteinGPer100g: '',
      carbohydratesGPer100g: '',
      fatGPer100g: '',
      fiberGPer100g: '',
    },
    validators: { onSubmit: foodSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const calories = parseDecimalInput(value.caloriesPer100g);
      const protein = parseDecimalInput(value.proteinGPer100g);
      const carbs = parseDecimalInput(value.carbohydratesGPer100g);
      const fat = parseDecimalInput(value.fatGPer100g);
      const fiber = parseDecimalInput(value.fiberGPer100g ?? '');
      if (calories == null || protein == null || carbs == null || fat == null) {
        setError('Nutrition values must be numbers.');
        return;
      }
      const data: CreateNutritionFoodDto = {
        name: value.name.trim(),
        brand: asOpenApiField<CreateNutritionFoodDtoBrand | undefined>(value.brand.trim() || undefined),
        caloriesPer100g: calories,
        proteinGPer100g: protein,
        carbohydratesGPer100g: carbs,
        fatGPer100g: fat,
        fiberGPer100g: asOpenApiField<CreateNutritionFoodDtoFiberGPer100g | undefined>(fiber),
      };
      try {
        await create.mutateAsync({ data });
        await invalidateTrainerFoods(queryClient);
        form.reset();
        toast.success(copy.create);
      } catch (err) {
        setError(mapApiError(err).description);
      }
    },
  });
  return (
    <WorkspaceSurface>
      <h2 className="text-base font-semibold">{copy.create}</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        {error ? <Alert variant="danger" className="sm:col-span-2">{error}</Alert> : null}
        <form.Field name="name">
          {(field) => (
            <div className="space-y-1 sm:col-span-2">
              <Label>{copy.name}</Label>
              <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
            </div>
          )}
        </form.Field>
        <form.Field name="caloriesPer100g">
          {(field) => (
            <div className="space-y-1">
              <Label>{trainerWorkspaceCopy.nutrition.calories}</Label>
              <Input inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
            </div>
          )}
        </form.Field>
        <form.Field name="proteinGPer100g">
          {(field) => (
            <div className="space-y-1">
              <Label>{trainerWorkspaceCopy.nutrition.protein}</Label>
              <Input inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
            </div>
          )}
        </form.Field>
        <form.Field name="carbohydratesGPer100g">
          {(field) => (
            <div className="space-y-1">
              <Label>{trainerWorkspaceCopy.nutrition.carbs}</Label>
              <Input inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
            </div>
          )}
        </form.Field>
        <form.Field name="fatGPer100g">
          {(field) => (
            <div className="space-y-1">
              <Label>{trainerWorkspaceCopy.nutrition.fat}</Label>
              <Input inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
            </div>
          )}
        </form.Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? trainerWorkspaceCopy.creating : copy.create}
          </Button>
        </div>
      </form>
    </WorkspaceSurface>
  );
}
