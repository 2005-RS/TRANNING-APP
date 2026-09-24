import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  CreateExerciseDtoDifficultyLevel,
  CreateExerciseDtoEquipmentType,
  CreateExerciseDtoPrimaryMuscleGroup,
  ExercisesListDifficultyLevel,
  ExercisesListEquipmentType,
  ExercisesListPrimaryMuscleGroup,
  ExercisesListStatus,
  type CreateExerciseDto,
} from '@/generated/models';
import { useExercisesCreate, useExercisesList } from '@/generated/exercises/exercises';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { NativeSelect, TextArea } from '@/features/trainer-workspace/components/workspace-surface';
import { PaginationBar } from '@/features/trainer-workspace/components/pagination-bar';
import { TrainerEmptyState, TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { enumLabel } from '@/features/trainer-workspace/lib/formatters';
import { invalidateTrainerExercises } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { exerciseSchema } from '@/features/trainer-workspace/schemas/plan-schemas';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { buttonVariants } from '@/shared/ui/button-variants';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/lib/utils';

export function TrainerExercisesPage() {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.exercises;
  const navigate = useNavigate({ from: '/trainer/exercises' });
  const search = useSearch({ from: '/trainer/exercises' });
  const [draft, setDraft] = useState(search.search ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const query = useExercisesList(
    {
      page: search.page ?? 1,
      limit: TRAINER_LIST_PAGE_SIZE,
      search: search.search,
      primaryMuscleGroup: search.primaryMuscleGroup as ExercisesListPrimaryMuscleGroup | undefined,
      equipmentType: search.equipmentType as ExercisesListEquipmentType | undefined,
      difficultyLevel: search.difficultyLevel as ExercisesListDifficultyLevel | undefined,
      status: search.status as ExercisesListStatus | undefined,
    },
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <PageTitle>{copy.title}</PageTitle>
            <PageDescription>{copy.description}</PageDescription>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {copy.create}
          </Button>
        </div>
      </PageHeader>

      <CreateExerciseSheet open={createOpen} onOpenChange={setCreateOpen} />

      <form
        className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_8rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({
            search: {
              ...search,
              search: draft.trim() || undefined,
              page: 1,
            },
            replace: true,
          });
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchPlaceholder}
        />
        <NativeSelect
          aria-label={copy.muscleFilter}
          value={search.primaryMuscleGroup ?? ''}
          onChange={(event) =>
            void navigate({
              search: {
                ...search,
                primaryMuscleGroup: event.target.value || undefined,
                page: 1,
              },
              replace: true,
            })
          }
        >
          <option value="">{copy.allMuscles}</option>
          {Object.values(CreateExerciseDtoPrimaryMuscleGroup).map((option) => (
            <option key={option} value={option}>
              {enumLabel('muscle', option)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={copy.equipment}
          value={search.equipmentType ?? ''}
          onChange={(event) =>
            void navigate({
              search: {
                ...search,
                equipmentType: event.target.value || undefined,
                page: 1,
              },
              replace: true,
            })
          }
        >
          <option value="">{copy.allEquipment}</option>
          {Object.values(CreateExerciseDtoEquipmentType).map((option) => (
            <option key={option} value={option}>
              {enumLabel('equipment', option)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={copy.difficulty}
          value={search.difficultyLevel ?? ''}
          onChange={(event) =>
            void navigate({
              search: {
                ...search,
                difficultyLevel: event.target.value || undefined,
                page: 1,
              },
              replace: true,
            })
          }
        >
          <option value="">{copy.allDifficulties}</option>
          {Object.values(CreateExerciseDtoDifficultyLevel).map((option) => (
            <option key={option} value={option}>
              {enumLabel('difficulty', option)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={trainerWorkspaceCopy.templates.statusFilter}
          value={search.status ?? ''}
          onChange={(event) =>
            void navigate({
              search: {
                ...search,
                status: event.target.value || undefined,
                page: 1,
              },
              replace: true,
            })
          }
        >
          <option value="">{copy.allStatuses}</option>
          {Object.values(ExercisesListStatus).map((option) => (
            <option key={option} value={option}>
              {trainerWorkspaceCopy.status[option]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit">{trainerWorkspaceCopy.search}</Button>
      </form>

      <h2 className="text-sm font-medium text-muted-foreground">{copy.libraryHeading}</h2>

      {query.data.data.length === 0 ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {query.data.data.map((exercise) => (
              <li key={exercise.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <ExerciseDemoPlayer
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    loadCatalogMedia
                    variant="card"
                    playback="hover"
                    labels={{
                      play: copy.playDemonstration,
                      pause: copy.pauseDemonstration,
                      loading: trainerWorkspaceCopy.exercises.loadingLabel,
                      empty: copy.mediaEmpty,
                      failed: copy.mediaFailed,
                      retry: copy.mediaRetry,
                    }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-base font-semibold">{exercise.name}</h3>
                        <StatusBadge status={exercise.status} />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {enumLabel('muscle', exercise.primaryMuscleGroup)} ·{' '}
                        {enumLabel('equipment', exercise.equipmentType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enumLabel('difficulty', exercise.difficultyLevel)}
                      </p>
                    </div>
                    <Link
                      to="/trainer/exercises/$exerciseId"
                      params={{ exerciseId: exercise.id }}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-auto self-end')}
                    >
                      {copy.open}
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <PaginationBar
            meta={query.data.meta}
            onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
          />
        </>
      )}
    </PageContainer>
  );
}

function CreateExerciseSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.exercises;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const create = useExercisesCreate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      instructions: '',
      primaryMuscleGroup: CreateExerciseDtoPrimaryMuscleGroup.CHEST as string,
      equipmentType: CreateExerciseDtoEquipmentType.BARBELL as string,
      difficultyLevel: CreateExerciseDtoDifficultyLevel.INTERMEDIATE as string,
    },
    validators: { onSubmit: exerciseSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const data: CreateExerciseDto = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
        instructions: value.instructions?.trim() || undefined,
        primaryMuscleGroup: value.primaryMuscleGroup as CreateExerciseDto['primaryMuscleGroup'],
        equipmentType: value.equipmentType as CreateExerciseDto['equipmentType'],
        difficultyLevel: value.difficultyLevel as CreateExerciseDto['difficultyLevel'],
      };
      try {
        const created = await create.mutateAsync({ data });
        await invalidateTrainerExercises(queryClient);
        form.reset();
        onOpenChange(false);
        toast.success(copy.created);
        void navigate({
          to: '/trainer/exercises/$exerciseId',
          params: { exerciseId: created.id },
        });
      } catch (err) {
        setError(mapApiError(err).description);
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeLabel={trainerWorkspaceCopy.templates.close} className="w-[min(28rem,90vw)] bg-background p-0">
        <SheetHeader>
          <SheetTitle>{copy.createTitle}</SheetTitle>
          <SheetDescription>
            {copy.createDescription} {copy.createThenUpload}
          </SheetDescription>
        </SheetHeader>
        <form
          className="grid gap-3 overflow-y-auto px-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <form.Field name="name">
            {(field) => (
              <Label className="block space-y-1">
                {copy.name}
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </Label>
            )}
          </form.Field>
          <form.Field name="primaryMuscleGroup">
            {(field) => (
              <EnumSelect
                label={copy.muscle}
                kind="muscle"
                value={field.state.value}
                options={CreateExerciseDtoPrimaryMuscleGroup}
                onChange={(next) => field.handleChange(next as typeof field.state.value)}
              />
            )}
          </form.Field>
          <form.Field name="equipmentType">
            {(field) => (
              <EnumSelect
                label={copy.equipment}
                kind="equipment"
                value={field.state.value}
                options={CreateExerciseDtoEquipmentType}
                onChange={(next) => field.handleChange(next as typeof field.state.value)}
              />
            )}
          </form.Field>
          <form.Field name="difficultyLevel">
            {(field) => (
              <EnumSelect
                label={copy.difficulty}
                kind="difficulty"
                value={field.state.value}
                options={CreateExerciseDtoDifficultyLevel}
                onChange={(next) => field.handleChange(next as typeof field.state.value)}
              />
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <Label className="block space-y-1">
                {copy.descriptionLabel}
                <TextArea
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Label>
            )}
          </form.Field>
          <form.Field name="instructions">
            {(field) => (
              <Label className="block space-y-1">
                {copy.instructions}
                <TextArea
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Label>
            )}
          </form.Field>
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? trainerWorkspaceCopy.creating : copy.create}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EnumSelect({
  label,
  kind,
  value,
  options,
  onChange,
}: {
  label: string;
  kind: 'muscle' | 'equipment' | 'difficulty';
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Label className="block space-y-1">
      {label}
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.values(options).map((option) => (
          <option key={option} value={option}>
            {enumLabel(kind, option)}
          </option>
        ))}
      </NativeSelect>
    </Label>
  );
}
