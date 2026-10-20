import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Dumbbell, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  UpdateWorkoutTemplateStatusDtoStatus,
  WorkoutTemplateResponseDtoStatus,
  type WorkoutTemplateExerciseInputDto,
  type WorkoutTemplateExerciseResponseDto,
} from '@/generated/models';
import {
  useWorkoutTemplatesDuplicate,
  useWorkoutTemplatesGetById,
  useWorkoutTemplatesReplaceExercises,
  useWorkoutTemplatesUpdate,
  useWorkoutTemplatesUpdateStatus,
} from '@/generated/workout-templates/workout-templates';
import { TemplateEditSheet } from '@/features/trainer-workspace/components/plan-edit-sheets';
import { PrescriptionSheet, type PrescriptionSheetMode } from '@/features/trainer-workspace/components/prescription-sheet';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TemplateExerciseRow } from '@/features/trainer-workspace/components/template-exercise-row';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerTemplates } from '@/features/trainer-workspace/lib/invalidate';
import { formatCount } from '@/features/trainer-workspace/lib/formatters';
import { itemToInput } from '@/features/trainer-workspace/lib/prescription';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { mapApiError } from '@/shared/errors/api-error';
import { cn } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui/alert';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import type { UpdateWorkoutTemplateDto } from '@/generated/models';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { PageActions, PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

const copy = trainerWorkspaceCopy.templates;
const TEMPLATE_NAME_MAX_LENGTH = 150;

export function TrainerTemplateDetailPage() {
  const templateId = useTrainerRouteId('templateId');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PrescriptionSheetMode | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const query = useWorkoutTemplatesGetById(templateId, {
    query: { enabled: Boolean(templateId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const replace = useWorkoutTemplatesReplaceExercises();
  const updateStatus = useWorkoutTemplatesUpdateStatus();
  const duplicate = useWorkoutTemplatesDuplicate();
  const update = useWorkoutTemplatesUpdate();

  if (query.isPending) {
    return <TrainerPageSkeleton label={copy.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <PageContainer>
        <TrainerErrorState
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      </PageContainer>
    );
  }

  const template = query.data;
  const canEdit = template.status !== WorkoutTemplateResponseDtoStatus.ARCHIVED;
  const canEmpty = template.status === WorkoutTemplateResponseDtoStatus.DRAFT;
  const inputs = template.items.map((item) => itemToInput(item));
  const busy = replace.isPending || updateStatus.isPending || duplicate.isPending || update.isPending;

  async function handleDuplicate() {
    setError(null);
    const name = copy.copyName(template.name);
    try {
      const created = await duplicate.mutateAsync({
        id: templateId,
        data: name.length <= TEMPLATE_NAME_MAX_LENGTH ? { name } : {},
      });
      await invalidateTrainerTemplates(queryClient);
      toast.success(copy.duplicated);
      void navigate({ to: '/trainer/training/$templateId', params: { templateId: created.id } });
    } catch (err) {
      setError(mapApiError(err).description);
    }
  }

  async function saveItems(next: WorkoutTemplateExerciseInputDto[], success: string = copy.saveExercises) {
    setError(null);
    await replace.mutateAsync({ id: templateId, data: { items: next } });
    await invalidateTrainerTemplates(queryClient);
    toast.success(success);
  }

  async function handleSave(input: WorkoutTemplateExerciseInputDto) {
    if (sheet?.kind === 'edit') {
      const index = template.items.findIndex((item) => item.id === sheet.item.id);
      if (index < 0) {
        return;
      }
      const next = [...inputs];
      next[index] = input;
      await saveItems(next);
    } else {
      await saveItems([...inputs, input], copy.exerciseAdded);
    }
    setSheet(null);
  }

  async function handleRemove() {
    if (sheet?.kind !== 'edit') {
      return;
    }
    try {
      await saveItems(inputs.filter((_, index) => template.items[index]?.id !== sheet.item.id));
      setSheet(null);
    } catch (err) {
      setError(mapApiError(err).description);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= inputs.length) {
      return;
    }
    const next = [...inputs];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);
    try {
      await saveItems(next);
    } catch (err) {
      setError(mapApiError(err).description);
    }
  }

  async function handleStatus(status: (typeof UpdateWorkoutTemplateStatusDtoStatus)[keyof typeof UpdateWorkoutTemplateStatusDtoStatus]) {
    setError(null);
    try {
      await updateStatus.mutateAsync({ id: templateId, data: { status } });
      await invalidateTrainerTemplates(queryClient);
      toast.success(
        status === UpdateWorkoutTemplateStatusDtoStatus.ACTIVE
          ? trainerWorkspaceCopy.activate
          : trainerWorkspaceCopy.archive,
      );
    } catch (err) {
      setError(mapApiError(err).description);
    }
  }

  return (
    <PageContainer className="space-y-5">
      <Link
        to="/trainer/training"
        className={cn(buttonVariants({ variant: 'ghost' }), '-ml-2 w-fit')}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {copy.backToLibrary}
      </Link>
      <PageHeader className="mb-0">
        <div className="min-w-0 space-y-1">
          <PageTitle className="text-2xl sm:text-2xl">{template.name}</PageTitle>
          {template.description ? (
            <PageDescription className="sm:text-sm">{template.description}</PageDescription>
          ) : null}
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">
              {formatCount(template.items.length, 'exercise', 'exercises')}
            </span>
            <StatusBadge status={template.status} />
          </p>
        </div>
        <PageActions className="w-full sm:w-auto">
          {canEdit ? (
            <Button className="w-full sm:w-auto" variant="outline" disabled={busy} onClick={() => setEditOpen(true)}>
              {copy.editTemplate}
            </Button>
          ) : null}
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            disabled={busy}
            onClick={() => void handleDuplicate()}
          >
            <Copy className="size-4" aria-hidden />
            {copy.duplicate}
          </Button>
          {canEdit ? (
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              disabled={busy}
              onClick={() => setSheet({ kind: 'add' })}
            >
              <Plus className="size-4" aria-hidden />
              {copy.addExercise}
            </Button>
          ) : null}
          {template.status === WorkoutTemplateResponseDtoStatus.ACTIVE ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void handleStatus(UpdateWorkoutTemplateStatusDtoStatus.ARCHIVED)}
            >
              {trainerWorkspaceCopy.archive}
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto"
              disabled={busy || template.items.length === 0}
              onClick={() => void handleStatus(UpdateWorkoutTemplateStatusDtoStatus.ACTIVE)}
            >
              {trainerWorkspaceCopy.activate}
            </Button>
          )}
        </PageActions>
      </PageHeader>
      {template.status === WorkoutTemplateResponseDtoStatus.DRAFT ? (
        <p className="text-sm text-muted-foreground">{copy.activateHint}</p>
      ) : template.status === WorkoutTemplateResponseDtoStatus.ACTIVE ? (
        <p className="text-sm text-muted-foreground">{copy.archiveHint}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.archivedHint}</p>
      )}
      {template.items.length === 0 && template.status !== WorkoutTemplateResponseDtoStatus.ACTIVE ? (
        <p className="text-sm text-muted-foreground">{copy.activateRequiresExercises}</p>
      ) : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className="space-y-3" aria-labelledby="template-exercises-heading" aria-busy={replace.isPending}>
        <h2 id="template-exercises-heading" className="text-sm font-medium text-muted-foreground">
          {copy.exercises}
        </h2>
        {template.items.length === 0 ? (
          <WorkspaceSurface className="flex flex-col items-center px-6 py-12 text-center">
            <Dumbbell className="size-8 text-muted-foreground" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{copy.builderEmptyTitle}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {copy.builderEmptyBody}
            </p>
            {canEdit ? (
              <Button className="mt-6" disabled={busy} onClick={() => setSheet({ kind: 'add' })}>
                {copy.addExercise}
              </Button>
            ) : null}
          </WorkspaceSurface>
        ) : (
          <WorkspaceSurface className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {template.items.map((item: WorkoutTemplateExerciseResponseDto, index) => (
                <TemplateExerciseRow
                  key={item.id}
                  item={item}
                  index={index}
                  total={template.items.length}
                  canEdit={canEdit}
                  pending={busy}
                  onEdit={() => setSheet({ kind: 'edit', item })}
                  onMove={(direction) => {
                    void handleMove(index, direction);
                  }}
                />
              ))}
            </ul>
          </WorkspaceSurface>
        )}
      </section>

      <PrescriptionSheet
        open={sheet != null}
        mode={sheet}
        canRemove={canEdit && (canEmpty || template.items.length > 1)}
        onOpenChange={(next) => {
          if (!next) {
            setSheet(null);
          }
        }}
        onSave={handleSave}
        onRemove={handleRemove}
      />
      <TemplateEditSheet
        key={`${template.id}-${template.updatedAt}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        name={template.name}
        description={template.description}
        pending={update.isPending}
        onSave={async (data, fail) => {
          try {
            await update.mutateAsync({
              id: templateId,
              data: {
                name: data.name,
                // Nullable strings are emitted as open objects by the OpenAPI generator.
                description: asOpenApiField<UpdateWorkoutTemplateDto['description']>(data.description),
              },
            });
            await invalidateTrainerTemplates(queryClient);
            toast.success(copy.updated);
            setEditOpen(false);
          } catch (err) {
            const mapped = mapApiError(err);
            fail(mapped.kind === 'invalid' ? trainerWorkspaceCopy.checkFields : mapped.kind === 'conflict' ? trainerWorkspaceCopy.notEditable : mapped.description);
          }
        }}
      />
    </PageContainer>
  );
}
