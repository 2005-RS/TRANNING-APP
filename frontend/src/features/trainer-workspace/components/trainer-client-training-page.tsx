import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrainingPlansListStatus, type CreateTrainingPlanDto } from '@/generated/models';
import { useTrainingPlansCreate, useTrainingPlansList } from '@/generated/training-plans/training-plans';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerEmptyState, TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { NativeSelect, TextArea, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerTraining } from '@/features/trainer-workspace/lib/invalidate';
import { formatIsoDate } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { namedPlanSchema } from '@/features/trainer-workspace/schemas/plan-schemas';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.training;

export function TrainerClientTrainingPage() {
  const clientId = useTrainerClientId();
  const [status, setStatus] = useState<string>('');
  const query = useTrainingPlansList(
    clientId,
    {
      limit: TRAINER_LIST_PAGE_SIZE,
      status: status ? (status as (typeof TrainingPlansListStatus)[keyof typeof TrainingPlansListStatus]) : undefined,
    },
    {
      query: {
        enabled: Boolean(clientId),
        staleTime: TRAINER_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="w-40 space-y-1">
          <Label htmlFor="plan-status">{trainerWorkspaceCopy.templates.statusFilter}</Label>
          <NativeSelect id="plan-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{trainerWorkspaceCopy.clients.any}</option>
            <option value="ACTIVE">{trainerWorkspaceCopy.status.ACTIVE}</option>
            <option value="DRAFT">{trainerWorkspaceCopy.status.DRAFT}</option>
            <option value="ARCHIVED">{trainerWorkspaceCopy.status.ARCHIVED}</option>
          </NativeSelect>
        </div>
      </div>
      <CreatePlanForm clientId={clientId} />
      {query.isPending ? (
        <WorkspaceSurface>
          <TrainerSectionSkeleton label={copy.loadingLabel} />
        </WorkspaceSurface>
      ) : query.isError || !query.data ? (
        <TrainerErrorState
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      ) : query.data.data.length === 0 ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <WorkspaceSurface className="p-0">
          <ul className="divide-y divide-border">
            {query.data.data.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatIsoDate(plan.startDate) ?? trainerWorkspaceCopy.notSet}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={plan.status} />
                  <Link
                    to="/trainer/clients/$clientId/training/$planId"
                    params={{ clientId, planId: plan.id }}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
                  >
                    {copy.openPlan}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </WorkspaceSurface>
      )}
    </div>
  );
}

function CreatePlanForm({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const create = useTrainingPlansCreate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { name: '', description: '', startDate: '', endDate: '' },
    validators: { onSubmit: namedPlanSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const data: CreateTrainingPlanDto = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
        startDate: value.startDate || undefined,
        endDate: value.endDate || undefined,
      };
      try {
        await create.mutateAsync({ clientId, data });
        await invalidateTrainerTraining(queryClient, clientId);
        form.reset();
        toast.success(copy.create);
      } catch (err) {
        setError(mapApiError(err).description);
      }
    },
  });

  return (
    <WorkspaceSurface>
      <h3 className="text-base font-semibold">{copy.create}</h3>
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
              <Label htmlFor="plan-name">{copy.name}</Label>
              <Input
                id="plan-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                required
              />
            </div>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="plan-description">{copy.descriptionLabel}</Label>
              <TextArea
                id="plan-description"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="startDate">
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="plan-start">{copy.startDate}</Label>
              <Input
                id="plan-start"
                type="date"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="endDate">
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="plan-end">{copy.endDate}</Label>
              <Input
                id="plan-end"
                type="date"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
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
