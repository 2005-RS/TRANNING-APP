import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UpdateNutritionPlanDto } from '@/generated/models';
import { useNutritionPlansGetById, useNutritionPlansUpdate, useNutritionPlansUpdateStatus } from '@/generated/nutrition-plans/nutrition-plans';
import { NutritionPlanEditSheet } from './plan-edit-sheets';
import { WorkspaceSurface } from './workspace-surface';
import { NutritionMealEditor } from './nutrition-meal-editor';
import { StatusBadge } from './status-badge';
import { TrainerErrorState } from './trainer-states';
import { TrainerSectionSkeleton } from './trainer-skeleton';
import { PlanTotals } from '@/features/client-nutrition/components/plan-totals';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatGrams, formatKcal } from '@/features/trainer-workspace/lib/formatters';
import { invalidateTrainerNutrition } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId, useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export function TrainerNutritionPlanDetailPage() {
  const clientId = useTrainerClientId();
  const planId = useTrainerRouteId('planId');
  return <NutritionPlanDetail key={`${clientId}-${planId}`} clientId={clientId} planId={planId} />;
}

function NutritionPlanDetail({ clientId, planId }: { clientId: string; planId: string }) {
  const copy = trainerWorkspaceCopy.nutrition;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const planQuery = useNutritionPlansGetById(clientId, planId, {
    query: { enabled: Boolean(clientId && planId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const updateStatus = useNutritionPlansUpdateStatus();
  const updatePlan = useNutritionPlansUpdate();

  if (planQuery.isPending) return <WorkspaceSurface><TrainerSectionSkeleton label={copy.loadingLabel} /></WorkspaceSurface>;
  if (planQuery.isError || !planQuery.data) return (
    <TrainerErrorState error={planQuery.error} retrying={planQuery.isFetching}
      onRetry={() => { if (!planQuery.isFetching) void planQuery.refetch(); }} />
  );
  const plan = planQuery.data;
  const editable = plan.status === 'DRAFT';
  const canEdit = plan.status !== 'ARCHIVED';
  const changeStatus = async (status: 'ACTIVE' | 'ARCHIVED') => {
    setError(null);
    try {
      await updateStatus.mutateAsync({ clientId, planId, data: { status } });
      await invalidateTrainerNutrition(queryClient, clientId);
      toast.success(status === 'ACTIVE' ? trainerWorkspaceCopy.activate : trainerWorkspaceCopy.archive);
    } catch (err) { setError(mapApiError(err).description); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/trainer/clients/$clientId/nutrition" params={{ clientId }} className="text-sm text-primary underline underline-offset-4">{copy.title}</Link>
          <h2 className="mt-2 break-words text-xl font-semibold tracking-tight">{plan.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.prescribedHint}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>{copy.editPlan}</Button> : null}
          <StatusBadge status={plan.status} />
        </div>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <PlanTotals plan={plan} variant="trainer" />
      {editable ? (
        <>
          <NutritionMealEditor plan={plan} clientId={clientId} onDirtyChange={setDirty} />
          <WorkspaceSurface className="space-y-3">
            {dirty ? <p id="nutrition-activation-hint" className="text-sm text-muted-foreground">{copy.unsaved}</p> : null}
            <Button disabled={dirty || updateStatus.isPending || plan.meals.length === 0}
              aria-describedby={dirty ? 'nutrition-activation-hint' : undefined}
              onClick={() => void changeStatus('ACTIVE')}>{trainerWorkspaceCopy.activate}</Button>
          </WorkspaceSurface>
        </>
      ) : (
        <>
          <WorkspaceSurface>
            <h3 className="text-base font-semibold">{copy.meals}</h3>
            {plan.meals.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{copy.noMeals}</p> : null}
            <ol className="mt-4 space-y-4">
              {plan.meals.map((meal) => (
                <li key={meal.id} className="space-y-3 rounded-md border border-border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h4 className="font-medium">{meal.name} · {trainerWorkspaceCopy.mealTypes[meal.mealType]}</h4>
                    <span className="font-mono text-sm">{formatKcal(meal.totals.caloriesKcal)}</span>
                  </div>
                  {meal.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{meal.notes}</p> : null}
                  <ul className="divide-y divide-border">
                    {meal.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0 break-words">
                          <p>{item.foodName}{item.brand ? ` · ${item.brand}` : ''}</p>
                          {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}
                        </div>
                        <span className="font-mono">{formatGrams(item.quantityGrams)} · {formatKcal(item.nutrition.caloriesKcal)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </WorkspaceSurface>
          {plan.status === 'ACTIVE' ? <Button variant="outline" disabled={updateStatus.isPending}
            onClick={() => void changeStatus('ARCHIVED')}>{trainerWorkspaceCopy.archive}</Button> : null}
        </>
      )}
      <NutritionPlanEditSheet
        key={`${plan.id}-${plan.updatedAt}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        pending={updatePlan.isPending}
        values={{
          name: plan.name,
          description: plan.description ?? '',
          startDate: plan.startDate ?? '',
          endDate: plan.endDate ?? '',
          targetCaloriesKcal: plan.targets.caloriesKcal == null ? '' : String(plan.targets.caloriesKcal),
          targetProteinG: plan.targets.proteinG == null ? '' : String(plan.targets.proteinG),
          targetCarbohydratesG: plan.targets.carbohydratesG == null ? '' : String(plan.targets.carbohydratesG),
          targetFatG: plan.targets.fatG == null ? '' : String(plan.targets.fatG),
        }}
        onSave={async (data, fail) => {
          try {
            await updatePlan.mutateAsync({
              clientId,
              planId,
              data: {
                ...data,
                description: data.description || null,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                targetCaloriesKcal: data.targetCaloriesKcal === '' ? null : Number(data.targetCaloriesKcal),
                targetProteinG: data.targetProteinG === '' ? null : Number(data.targetProteinG),
                targetCarbohydratesG: data.targetCarbohydratesG === '' ? null : Number(data.targetCarbohydratesG),
                targetFatG: data.targetFatG === '' ? null : Number(data.targetFatG),
              } as UpdateNutritionPlanDto,
            });
            await invalidateTrainerNutrition(queryClient, clientId);
            toast.success(trainerWorkspaceCopy.changesSaved);
            setEditOpen(false);
          } catch (err) {
            const mapped = mapApiError(err);
            fail(mapped.kind === 'invalid' ? trainerWorkspaceCopy.checkFields : mapped.kind === 'conflict' ? trainerWorkspaceCopy.notEditable : mapped.description);
          }
        }}
      />
    </div>
  );
}
