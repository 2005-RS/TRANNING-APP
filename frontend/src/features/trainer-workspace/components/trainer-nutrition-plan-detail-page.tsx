import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  NutritionPlanMealInputDtoMealType,
  NutritionPlanResponseDtoStatus,
  NutritionFoodsListStatus,
  UpdateNutritionPlanStatusDtoStatus,
  type NutritionPlanMealInputDto,
  type NutritionPlanMealInputDtoNotes,
  type NutritionPlanMealItemInputDtoNotes,
} from '@/generated/models';
import {
  useNutritionPlansGetById,
  useNutritionPlansReplaceMeals,
  useNutritionPlansUpdateStatus,
} from '@/generated/nutrition-plans/nutrition-plans';
import { useNutritionFoodsList } from '@/generated/nutrition-foods/nutrition-foods';
import { NativeSelect, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { parseDecimalInput } from '@/features/trainer-workspace/lib/finite-number';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { formatGrams, formatKcal } from '@/features/trainer-workspace/lib/formatters';
import { invalidateTrainerNutrition } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId, useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const copy = trainerWorkspaceCopy.nutrition;
const mealTypes = Object.values(NutritionPlanMealInputDtoMealType);

export function TrainerNutritionPlanDetailPage() {
  const clientId = useTrainerClientId();
  const planId = useTrainerRouteId('planId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const planQuery = useNutritionPlansGetById(clientId, planId, {
    query: { enabled: Boolean(clientId && planId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const foodsQuery = useNutritionFoodsList(
    { limit: 50, status: NutritionFoodsListStatus.ACTIVE },
    { query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const replaceMeals = useNutritionPlansReplaceMeals();
  const updateStatus = useNutritionPlansUpdateStatus();
  const foods = foodsQuery.data?.data ?? [];

  const initialMeals = useMemo<NutritionPlanMealInputDto[]>(
    () =>
      (planQuery.data?.meals ?? []).map((meal) => ({
        name: meal.name,
        mealType: meal.mealType,
        notes: asOpenApiField<NutritionPlanMealInputDtoNotes | undefined>(meal.notes ?? null),
        items: meal.items.map((item) => ({
          foodId: item.foodId,
          quantityGrams: item.quantityGrams,
          notes: asOpenApiField<NutritionPlanMealItemInputDtoNotes | undefined>(item.notes ?? null),
        })),
      })),
    [planQuery.data],
  );
  const [meals, setMeals] = useState<NutritionPlanMealInputDto[] | null>(null);
  const draft = meals ?? initialMeals;

  if (planQuery.isPending) {
    return (
      <WorkspaceSurface>
        <TrainerSectionSkeleton label={copy.loadingLabel} />
      </WorkspaceSurface>
    );
  }
  if (planQuery.isError || !planQuery.data) {
    return (
      <TrainerErrorState
        error={planQuery.error}
        retrying={planQuery.isFetching}
        onRetry={() => {
          if (!planQuery.isFetching) {
            void planQuery.refetch();
          }
        }}
      />
    );
  }

  const plan = planQuery.data;
  const editable = plan.status === NutritionPlanResponseDtoStatus.DRAFT;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              void navigate({ to: '/trainer/clients/$clientId/nutrition', params: { clientId } });
            }}
          >
            {copy.title}
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
          <p className="text-xs text-muted-foreground">{copy.prescribedHint}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <WorkspaceSurface>
        <h3 className="text-base font-semibold">{copy.targets}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">{copy.calories}</dt>
            <dd className="font-mono tabular-nums">{formatKcal(plan.targets.caloriesKcal) ?? trainerWorkspaceCopy.notSet}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{copy.protein}</dt>
            <dd className="font-mono tabular-nums">{formatGrams(plan.targets.proteinG) ?? trainerWorkspaceCopy.notSet}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{copy.carbs}</dt>
            <dd className="font-mono tabular-nums">{formatGrams(plan.targets.carbohydratesG) ?? trainerWorkspaceCopy.notSet}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{copy.fat}</dt>
            <dd className="font-mono tabular-nums">{formatGrams(plan.targets.fatG) ?? trainerWorkspaceCopy.notSet}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          {copy.mealTotals}: {formatKcal(plan.mealPlanTotals.caloriesKcal)}
        </p>
      </WorkspaceSurface>

      {editable ? (
        <WorkspaceSurface className="flex flex-wrap gap-2">
          <Button
            disabled={updateStatus.isPending}
            onClick={async () => {
              setError(null);
              try {
                await updateStatus.mutateAsync({
                  clientId,
                  planId,
                  data: { status: UpdateNutritionPlanStatusDtoStatus.ACTIVE },
                });
                await invalidateTrainerNutrition(queryClient, clientId);
                toast.success(trainerWorkspaceCopy.activate);
              } catch (err) {
                setError(mapApiError(err).description);
              }
            }}
          >
            {trainerWorkspaceCopy.activate}
          </Button>
        </WorkspaceSurface>
      ) : plan.status === NutritionPlanResponseDtoStatus.ACTIVE ? (
        <WorkspaceSurface>
          <Button
            variant="outline"
            disabled={updateStatus.isPending}
            onClick={async () => {
              setError(null);
              try {
                await updateStatus.mutateAsync({
                  clientId,
                  planId,
                  data: { status: UpdateNutritionPlanStatusDtoStatus.ARCHIVED },
                });
                await invalidateTrainerNutrition(queryClient, clientId);
                toast.success(trainerWorkspaceCopy.archive);
              } catch (err) {
                setError(mapApiError(err).description);
              }
            }}
          >
            {trainerWorkspaceCopy.archive}
          </Button>
        </WorkspaceSurface>
      ) : null}

      <WorkspaceSurface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{copy.meals}</h3>
          {editable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMeals([
                  ...draft,
                  {
                    name: 'Meal',
                    mealType: NutritionPlanMealInputDtoMealType.OTHER,
                    items: foods[0] ? [{ foodId: foods[0].id, quantityGrams: 100 }] : [],
                  },
                ])
              }
            >
              {copy.addMeal}
            </Button>
          ) : null}
        </div>
        {draft.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{copy.noMeals}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {draft.map((meal, mealIndex) => (
              <li key={`${meal.name}-${mealIndex}`} className="rounded-md border border-border p-3 space-y-3">
                {editable ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>{copy.mealName}</Label>
                      <Input
                        value={meal.name}
                        onChange={(event) => {
                          const next = [...draft];
                          next[mealIndex] = { ...meal, name: event.target.value };
                          setMeals(next);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{copy.mealType}</Label>
                      <NativeSelect
                        value={meal.mealType}
                        onChange={(event) => {
                          const next = [...draft];
                          next[mealIndex] = {
                            ...meal,
                            mealType: event.target.value as NutritionPlanMealInputDtoMealType,
                          };
                          setMeals(next);
                        }}
                      >
                        {mealTypes.map((type) => (
                          <option key={type} value={type}>
                            {trainerWorkspaceCopy.mealTypes[type]}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium">
                    {meal.name} · {trainerWorkspaceCopy.mealTypes[meal.mealType]}
                  </p>
                )}
                <ul className="space-y-2">
                  {meal.items.map((item, itemIndex) => (
                    <li key={`${item.foodId}-${itemIndex}`} className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                      {editable ? (
                        <>
                          <NativeSelect
                            value={item.foodId}
                            aria-label={copy.food}
                            onChange={(event) => {
                              const next = [...draft];
                              const items = [...meal.items];
                              items[itemIndex] = { ...item, foodId: event.target.value };
                              next[mealIndex] = { ...meal, items };
                              setMeals(next);
                            }}
                          >
                            {foods.map((food) => (
                              <option key={food.id} value={food.id}>
                                {food.name}
                              </option>
                            ))}
                          </NativeSelect>
                          <Input
                            inputMode="decimal"
                            aria-label={copy.quantity}
                            value={String(item.quantityGrams)}
                            onChange={(event) => {
                              const parsed = parseDecimalInput(event.target.value);
                              const next = [...draft];
                              const items = [...meal.items];
                              items[itemIndex] = {
                                ...item,
                                quantityGrams: parsed ?? item.quantityGrams,
                              };
                              next[mealIndex] = { ...meal, items };
                              setMeals(next);
                            }}
                          />
                        </>
                      ) : (
                        <p className="text-sm">
                          {foods.find((food) => food.id === item.foodId)?.name ?? copy.food} ·{' '}
                          {formatGrams(item.quantityGrams)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {editable && foods[0] ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [...draft];
                      next[mealIndex] = {
                        ...meal,
                        items: [...meal.items, { foodId: foods[0]!.id, quantityGrams: 50 }],
                      };
                      setMeals(next);
                    }}
                  >
                    {copy.addItem}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <Button
            className="mt-4"
            disabled={replaceMeals.isPending}
            onClick={async () => {
              setError(null);
              try {
                await replaceMeals.mutateAsync({ clientId, planId, data: { meals: draft } });
                await invalidateTrainerNutrition(queryClient, clientId);
                toast.success(copy.saveMeals);
              } catch (err) {
                setError(mapApiError(err).description);
              }
            }}
          >
            {copy.saveMeals}
          </Button>
        ) : null}
      </WorkspaceSurface>
    </div>
  );
}
