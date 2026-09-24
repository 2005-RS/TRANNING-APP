import { useState } from 'react';
import { Archive, ChevronLeft, Edit, FileImage, FileVideo, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateExerciseDto, ExerciseMediaResponseDto, ExerciseResponseDto, UpdateExerciseDto } from '@/generated/models';
import {
  CreateExerciseDtoDifficultyLevel,
  CreateExerciseDtoEquipmentType,
  CreateExerciseDtoPrimaryMuscleGroup,
  UpdateExerciseStatusDtoStatus,
} from '@/generated/models';
import {
  getExercisesGetByIdQueryKey,
  getExercisesListQueryKey,
  useExercisesCreate,
  useExercisesGetById,
  useExercisesList,
  useExercisesUpdate,
  useExercisesUpdateStatus,
} from '@/generated/exercises/exercises';
import {
  exerciseMediaCreateAccessUrl,
  getExerciseMediaListQueryKey,
  useExerciseMediaCreateUploadRequest,
  useExerciseMediaFinalize,
  useExerciseMediaList,
  useExerciseMediaRemove,
} from '@/generated/exercise-media/exercise-media';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { ConfirmSheet } from '@/features/admin-workspace/components/confirm-sheet';
import { AdminFormSheet, FormSelectField, FormTextField } from '@/features/admin-workspace/components/admin-form';
import {
  AdminErrorState,
  AdminField,
  AdminFilePicker,
  AdminFormError,
  AdminListEmptyState,
  AdminListSkeleton,
  AdminPageScaffold,
  AdminPageSkeleton,
  AdminStatusBadge,
  AdminSurface,
  AdminTableSurface,
  Detail,
  NativeSelect,
  PaginationBar,
  SearchInput,
} from '@/features/admin-workspace/components/admin-primitives';
import { adminBackLinkClassName, resetFileInput } from '@/features/admin-workspace/lib/ui';
import { adminMutationError } from '@/features/admin-workspace/lib/errors';
import { displayDateTime, formatBytes, optionalText } from '@/features/admin-workspace/lib/formatters';
import { exerciseFormSchema, exerciseMediaTypeFor, EXERCISE_MEDIA_MIME_TYPES } from '@/features/admin-workspace/lib/schemas';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { interpolate } from '@/i18n/format';
import { postSignedUpload } from '@/shared/lib/signed-upload';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const STALE_TIME_MS = 60_000;
const MUSCLES = Object.values(CreateExerciseDtoPrimaryMuscleGroup);
const EQUIPMENT = Object.values(CreateExerciseDtoEquipmentType);
const DIFFICULTIES = Object.values(CreateExerciseDtoDifficultyLevel);
const MEDIA_ACCEPT = [...EXERCISE_MEDIA_MIME_TYPES.VIDEO, ...EXERCISE_MEDIA_MIME_TYPES.IMAGE].join(',');

export function AdminExercisesPage() {
  const copy = useAdminWorkspaceCopy();
  const navigate = useNavigate({ from: '/admin/exercises' });
  const search = useSearch({ from: '/admin/exercises' });
  const [draftSearch, setDraftSearch] = useState(search.search ?? '');
  const [creating, setCreating] = useState(false);
  const query = useExercisesList(
    {
      page: search.page ?? 1,
      limit: PAGE_SIZE,
      search: search.search,
      status: search.status,
      primaryMuscleGroup: search.primaryMuscleGroup,
      equipmentType: search.equipmentType,
      difficultyLevel: search.difficultyLevel,
    },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const filtered = Boolean(
    search.search || search.status || search.primaryMuscleGroup || search.equipmentType || search.difficultyLevel,
  );

  function clearFilters() {
    setDraftSearch('');
    void navigate({ search: {}, replace: true });
  }

  return (
    <AdminPageScaffold
      title={copy.exercises.title}
      description={copy.exercises.description}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {copy.exercises.newExercise}
        </Button>
      }
    >
      <form
        role="search"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(14rem,1fr)_11rem_11rem_10rem_9rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ search: { ...search, search: draftSearch.trim() || undefined, page: undefined }, replace: true });
        }}
      >
        <SearchInput
          label={copy.exercises.searchLabel}
          value={draftSearch}
          placeholder={copy.common.searchPlaceholder}
          onChange={setDraftSearch}
        />
        <Filter
          label={copy.exercises.muscle}
          value={search.primaryMuscleGroup}
          values={MUSCLES}
          labels={copy.muscles}
          onChange={(value) => void navigate({ search: { ...search, primaryMuscleGroup: value, page: undefined }, replace: true })}
        />
        <Filter
          label={copy.exercises.equipment}
          value={search.equipmentType}
          values={EQUIPMENT}
          labels={copy.equipment}
          onChange={(value) => void navigate({ search: { ...search, equipmentType: value, page: undefined }, replace: true })}
        />
        <Filter
          label={copy.exercises.difficulty}
          value={search.difficultyLevel}
          values={DIFFICULTIES}
          labels={copy.difficulty}
          onChange={(value) => void navigate({ search: { ...search, difficultyLevel: value, page: undefined }, replace: true })}
        />
        <AdminField label={copy.common.status}>
          <NativeSelect
            value={search.status === 'ARCHIVED' ? 'ARCHIVED' : ''}
            onChange={(event) => {
              const status = event.target.value === 'ARCHIVED' ? ('ARCHIVED' as const) : undefined;
              void navigate({ search: { ...search, status, page: undefined }, replace: true });
            }}
          >
            <option value="">{copy.status.ACTIVE}</option>
            <option value="ARCHIVED">{copy.status.ARCHIVED}</option>
          </NativeSelect>
        </AdminField>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit">{copy.search}</Button>
          {filtered ? (
            <Button type="button" variant="outline" onClick={clearFilters}>
              {copy.clearFilters}
            </Button>
          ) : null}
        </div>
      </form>

      {query.isPending ? (
        <AdminListSkeleton label={copy.exercises.loadingLabel} />
      ) : query.isError || !query.data ? (
        <AdminErrorState
          inline
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      ) : query.data.data.length === 0 ? (
        <AdminListEmptyState
          filtered={filtered}
          emptyTitle={copy.exercises.emptyTitle}
          emptyBody={copy.exercises.emptyBody}
          onClearFilters={clearFilters}
          emptyActions={<Button onClick={() => setCreating(true)}>{copy.exercises.newExercise}</Button>}
        />
      ) : (
        <>
          <AdminTableSurface>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.exercises.title}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">{copy.common.name}</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">{copy.exercises.equipment}</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{copy.exercises.difficulty}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:text-left">{copy.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((exercise) => (
                  <tr key={exercise.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        to="/admin/exercises/$exerciseId"
                        params={{ exerciseId: exercise.id }}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {exercise.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {copy.muscles[exercise.primaryMuscleGroup]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{copy.equipment[exercise.equipmentType]}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {copy.difficulty[exercise.difficultyLevel]}
                    </td>
                    <td className="px-4 py-3 text-right sm:text-left">
                      <AdminStatusBadge status={exercise.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableSurface>
          <PaginationBar
            meta={query.data.meta}
            onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
          />
        </>
      )}
      <ExerciseSheet open={creating} onOpenChange={setCreating} mode="create" />
    </AdminPageScaffold>
  );
}

export function AdminExerciseDetailPage() {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const { exerciseId } = useParams({ from: '/admin/exercises/$exerciseId' });
  const queryOptions = { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } };
  const exerciseQuery = useExercisesGetById(exerciseId, queryOptions);
  const mediaQuery = useExerciseMediaList(exerciseId, queryOptions);
  const statusMutation = useExercisesUpdateStatus();
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (exerciseQuery.isPending) {
    return <AdminPageSkeleton label={copy.exercises.loadingLabel} />;
  }
  if (exerciseQuery.isError || !exerciseQuery.data) {
    return (
      <AdminErrorState
        error={exerciseQuery.error}
        retrying={exerciseQuery.isFetching}
        onRetry={() => {
          if (!exerciseQuery.isFetching) {
            void exerciseQuery.refetch();
          }
        }}
      />
    );
  }

  const exercise = exerciseQuery.data;
  const archived = exercise.status === 'ARCHIVED';
  const ownedByViewer = user?.id === exercise.createdByUserId;

  async function updateStatus() {
    if (statusMutation.isPending) {
      return;
    }
    setStatusError(null);
    try {
      await statusMutation.mutateAsync({
        id: exercise.id,
        data: { status: archived ? UpdateExerciseStatusDtoStatus.ACTIVE : UpdateExerciseStatusDtoStatus.ARCHIVED },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getExercisesListQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getExercisesGetByIdQueryKey(exercise.id) }),
      ]);
      setConfirmStatus(false);
      toast.success(copy.exercises.statusToast);
    } catch (err) {
      setStatusError(adminMutationError(err, 'exercise', copy));
    }
  }

  return (
    <AdminPageScaffold
      title={exercise.name}
      meta={<AdminStatusBadge status={exercise.status} />}
      backLink={
        <Link to="/admin/exercises" className={adminBackLinkClassName}>
          <ChevronLeft className="size-4" aria-hidden />
          {copy.exercises.backToList}
        </Link>
      }
      actions={
        <>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="size-4" aria-hidden />
            {copy.common.edit}
          </Button>
          <Button
            variant={archived ? 'default' : 'outline'}
            onClick={() => {
              setStatusError(null);
              setConfirmStatus(true);
            }}
          >
            {archived ? <RotateCcw className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
            {archived ? copy.common.activate : copy.common.archive}
          </Button>
        </>
      }
    >
      <AdminSurface aria-labelledby="exercise-detail-heading">
        <h2 id="exercise-detail-heading" className="sr-only">
          {copy.exercises.detailTitle}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={copy.exercises.muscle} value={copy.muscles[exercise.primaryMuscleGroup]} />
          <Detail label={copy.exercises.equipment} value={copy.equipment[exercise.equipmentType]} />
          <Detail label={copy.exercises.difficulty} value={copy.difficulty[exercise.difficultyLevel]} />
          <Detail
            label={copy.exercises.source}
            value={ownedByViewer ? copy.exercises.createdByYou : copy.exercises.createdByOther}
          />
          <Detail
            className="sm:col-span-2 lg:col-span-4"
            label={copy.exercises.descriptionLabel}
            value={optionalText(exercise.description, copy.notSet)}
          />
          <Detail
            className="sm:col-span-2 lg:col-span-4"
            label={copy.exercises.instructions}
            value={optionalText(exercise.instructions, copy.notSet)}
          />
          <Detail label={copy.common.created} value={displayDateTime(exercise.createdAt)} />
          <Detail label={copy.common.updated} value={displayDateTime(exercise.updatedAt)} />
        </dl>
      </AdminSurface>
      <ExerciseMediaPanel
        exercise={exercise}
        media={mediaQuery.data ?? []}
        loading={mediaQuery.isPending}
        loadError={mediaQuery.isError ? mediaQuery.error : null}
        onRetry={() => void mediaQuery.refetch()}
      />
      <ExerciseSheet
        open={editing}
        onOpenChange={setEditing}
        mode="edit"
        exercise={exercise}
        ownedByViewer={ownedByViewer}
      />
      <ConfirmSheet
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={archived ? copy.exercises.activateTitle : copy.exercises.archiveTitle}
        description={archived ? copy.exercises.activateBody : copy.exercises.archiveBody}
        confirmLabel={archived ? copy.common.activate : copy.common.archive}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={statusMutation.isPending}
        danger={!archived}
        error={statusError}
        onConfirm={() => void updateStatus()}
      />
    </AdminPageScaffold>
  );
}

function Filter<T extends string>({
  label,
  value,
  values,
  labels,
  onChange,
}: {
  label: string;
  value?: T;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T | undefined) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  return (
    <AdminField label={label}>
      <NativeSelect value={value ?? ''} onChange={(event) => onChange(values.find((item) => item === event.target.value))}>
        <option value="">{copy.all}</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {labels[item]}
          </option>
        ))}
      </NativeSelect>
    </AdminField>
  );
}

function exerciseDefaults(exercise?: ExerciseResponseDto) {
  return {
    name: exercise?.name ?? '',
    description: exercise?.description ?? '',
    instructions: exercise?.instructions ?? '',
    primaryMuscleGroup: exercise?.primaryMuscleGroup ?? '',
    equipmentType: exercise?.equipmentType ?? '',
    difficultyLevel: exercise?.difficultyLevel ?? CreateExerciseDtoDifficultyLevel.BEGINNER,
  } as {
    name: string;
    description: string;
    instructions: string;
    primaryMuscleGroup: string;
    equipmentType: string;
    difficultyLevel: string;
  };
}

function ExerciseSheet({
  open,
  onOpenChange,
  mode,
  exercise,
  ownedByViewer = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  exercise?: ExerciseResponseDto;
  ownedByViewer?: boolean;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const create = useExercisesCreate();
  const update = useExercisesUpdate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: exerciseDefaults(exercise),
    validators: { onSubmit: exerciseFormSchema(copy) },
    onSubmit: async ({ value }) => {
      setError(null);
      const primaryMuscleGroup =
        MUSCLES.find((item) => item === value.primaryMuscleGroup) ?? CreateExerciseDtoPrimaryMuscleGroup.OTHER;
      const equipmentType = EQUIPMENT.find((item) => item === value.equipmentType) ?? CreateExerciseDtoEquipmentType.OTHER;
      const difficultyLevel =
        DIFFICULTIES.find((item) => item === value.difficultyLevel) ?? CreateExerciseDtoDifficultyLevel.BEGINNER;
      const description = value.description.trim();
      const instructions = value.instructions.trim();
      try {
        if (mode === 'create') {
          const data: CreateExerciseDto = {
            name: value.name.trim(),
            description: description || undefined,
            instructions: instructions || undefined,
            primaryMuscleGroup,
            equipmentType,
            difficultyLevel,
          };
          await create.mutateAsync({ data });
          toast.success(copy.exercises.createdToast);
        } else if (exercise) {
          const data: UpdateExerciseDto = {
            name: value.name.trim(),
            description: asOpenApiField<UpdateExerciseDto['description']>(description || null),
            instructions: asOpenApiField<UpdateExerciseDto['instructions']>(instructions || null),
            primaryMuscleGroup,
            equipmentType,
            difficultyLevel,
          };
          await update.mutateAsync({ id: exercise.id, data });
          await queryClient.invalidateQueries({ queryKey: getExercisesGetByIdQueryKey(exercise.id) });
          toast.success(copy.exercises.savedToast);
        }
        await queryClient.invalidateQueries({ queryKey: getExercisesListQueryKey() });
        form.reset();
        onOpenChange(false);
      } catch (err) {
        setError(adminMutationError(err, 'exercise', copy));
      }
    },
  });

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(submitting) => (
        <AdminFormSheet
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              form.reset();
              setError(null);
            }
            onOpenChange(next);
          }}
          title={mode === 'create' ? copy.exercises.newExercise : copy.exercises.editExercise}
          description={copy.exercises.description}
          error={error}
          submitting={submitting}
          submitLabel={mode === 'create' ? copy.create : copy.save}
          submittingLabel={mode === 'create' ? copy.creating : copy.saving}
          onSubmit={() => void form.handleSubmit()}
          className="w-[min(36rem,100vw)]"
        >
          {mode === 'edit' && !ownedByViewer ? <Alert variant="muted">{copy.exercises.otherOwnerWarning}</Alert> : null}
          <form.Field name="name">
            {(field) => <FormTextField field={field} id={`exercise-${mode}-name`} label={copy.common.name} autoComplete="off" />}
          </form.Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="primaryMuscleGroup">
              {(field) => (
                <FormSelectField field={field} id={`exercise-${mode}-muscle`} label={copy.exercises.muscle}>
                  <option value="" disabled>
                    {copy.notSet}
                  </option>
                  {MUSCLES.map((item) => (
                    <option key={item} value={item}>
                      {copy.muscles[item]}
                    </option>
                  ))}
                </FormSelectField>
              )}
            </form.Field>
            <form.Field name="equipmentType">
              {(field) => (
                <FormSelectField field={field} id={`exercise-${mode}-equipment`} label={copy.exercises.equipment}>
                  <option value="" disabled>
                    {copy.notSet}
                  </option>
                  {EQUIPMENT.map((item) => (
                    <option key={item} value={item}>
                      {copy.equipment[item]}
                    </option>
                  ))}
                </FormSelectField>
              )}
            </form.Field>
            <form.Field name="difficultyLevel">
              {(field) => (
                <FormSelectField field={field} id={`exercise-${mode}-difficulty`} label={copy.exercises.difficulty}>
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {copy.difficulty[item]}
                    </option>
                  ))}
                </FormSelectField>
              )}
            </form.Field>
          </div>
          <form.Field name="description">
            {(field) => (
              <FormTextField
                field={field}
                id={`exercise-${mode}-description`}
                label={copy.exercises.descriptionLabel}
                optional
                multiline
              />
            )}
          </form.Field>
          <form.Field name="instructions">
            {(field) => (
              <FormTextField
                field={field}
                id={`exercise-${mode}-instructions`}
                label={copy.exercises.instructions}
                optional
                multiline
                rows={6}
              />
            )}
          </form.Field>
        </AdminFormSheet>
      )}
    </form.Subscribe>
  );
}

type MediaPreview = { id: string; name: string; type: 'IMAGE' | 'VIDEO'; url: string };

function mediaName(item: ExerciseMediaResponseDto, copy: ReturnType<typeof useAdminWorkspaceCopy>) {
  return item.originalFileName ?? (item.mediaType === 'VIDEO' ? copy.exercises.video : copy.exercises.image);
}

function ExerciseMediaPanel({
  exercise,
  media,
  loading,
  loadError,
  onRetry,
}: {
  exercise: ExerciseResponseDto;
  media: ExerciseMediaResponseDto[];
  loading: boolean;
  loadError: unknown;
  onRetry: () => void;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const createUpload = useExerciseMediaCreateUploadRequest();
  const finalize = useExerciseMediaFinalize();
  const remove = useExerciseMediaRemove();
  const fileId = `exercise-media-file-${exercise.id}`;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExerciseMediaResponseDto | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function upload() {
    if (uploading) {
      return;
    }
    setUploadError(null);
    if (!file || file.size === 0) {
      setUploadError(copy.common.fieldRequired);
      return;
    }
    const mediaType = exerciseMediaTypeFor(file.type);
    if (!mediaType) {
      setUploadError(copy.exercises.unsupportedFile);
      return;
    }
    setUploading(true);
    try {
      const request = await createUpload.mutateAsync({
        exerciseId: exercise.id,
        data: { mediaType, fileName: file.name, mimeType: file.type, fileSizeBytes: file.size, displayOrder: 0 },
      });
      await postSignedUpload(request.upload, file);
      await finalize.mutateAsync({ exerciseId: exercise.id, mediaId: request.media.id });
      toast.success(copy.exercises.uploadedToast);
      setFile(null);
      resetFileInput(fileId);
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message === 'UPLOAD_FAILED'
          ? copy.exercises.uploadFailed
          : adminMutationError(err, 'exerciseMedia', copy),
      );
    } finally {
      setUploading(false);
      await queryClient.invalidateQueries({ queryKey: getExerciseMediaListQueryKey(exercise.id) });
    }
  }

  async function openMedia(item: ExerciseMediaResponseDto) {
    if (openingId) {
      return;
    }
    setMediaError(null);
    setOpeningId(item.id);
    try {
      const access = await exerciseMediaCreateAccessUrl(exercise.id, item.id);
      setPreview({ id: item.id, name: mediaName(item, copy), type: item.mediaType, url: access.url });
    } catch (err) {
      setMediaError(adminMutationError(err, 'exerciseMedia', copy));
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteMedia() {
    if (!pendingDelete || remove.isPending) {
      return;
    }
    setDeleteError(null);
    try {
      await remove.mutateAsync({ exerciseId: exercise.id, mediaId: pendingDelete.id });
      if (preview?.id === pendingDelete.id) {
        setPreview(null);
      }
      await queryClient.invalidateQueries({ queryKey: getExerciseMediaListQueryKey(exercise.id) });
      setPendingDelete(null);
      toast.success(copy.exercises.mediaDeletedToast);
    } catch (err) {
      setDeleteError(adminMutationError(err, 'exerciseMedia', copy));
    }
  }

  return (
    <AdminSurface aria-labelledby="exercise-media-heading">
      <h2 id="exercise-media-heading" className="text-base font-semibold tracking-tight">
        {copy.exercises.media}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.exercises.mediaHint}</p>

      {exercise.status === 'ACTIVE' ? (
        <form
          className="mt-4 space-y-3 rounded-md border border-dashed border-border p-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void upload();
          }}
        >
          <AdminFormError error={uploadError} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={fileId} className="block text-sm font-medium" id={`${fileId}-label`}>
                {copy.exercises.file}
              </label>
              <AdminFilePicker
                id={fileId}
                accept={MEDIA_ACCEPT}
                file={file}
                disabled={uploading}
                describedBy={`${fileId}-label ${fileId}-types`}
                invalid={Boolean(uploadError)}
                onChange={(next) => {
                  setFile(next);
                  setUploadError(null);
                }}
              />
              <p id={`${fileId}-types`} className="text-xs text-muted-foreground">
                {copy.exercises.fileTypes}
              </p>
            </div>
            <Button type="submit" disabled={uploading || !file}>
              <Upload className="size-4" aria-hidden />
              {uploading ? copy.exercises.uploading : copy.exercises.uploadMedia}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {copy.exercises.archivedMediaHint}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <AdminFormError error={mediaError} />
        {preview ? (
          <figure className="overflow-hidden rounded-lg border border-border bg-background">
            <figcaption className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium">{preview.name}</span>
              <Button variant="ghost" size="icon" className="size-9" aria-label={copy.exercises.closePreview} onClick={() => setPreview(null)}>
                <X className="size-4" aria-hidden />
              </Button>
            </figcaption>
            {preview.type === 'IMAGE' ? (
              <img
                src={preview.url}
                alt={preview.name}
                referrerPolicy="no-referrer"
                className="max-h-[28rem] w-full object-contain"
              />
            ) : (
              <video src={preview.url} className="max-h-[28rem] w-full" controls preload="metadata" playsInline />
            )}
          </figure>
        ) : null}

        {loading ? (
          <div className="space-y-2" role="status" aria-label={copy.loadingLabel}>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : loadError ? (
          <div className="space-y-3">
            <Alert variant="danger">{adminMutationError(loadError, 'exerciseMedia', copy)}</Alert>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {copy.retry}
            </Button>
          </div>
        ) : media.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.exercises.mediaEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {media.map((item) => {
              const name = mediaName(item, copy);
              const Icon = item.mediaType === 'VIDEO' ? FileVideo : FileImage;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.mediaType === 'VIDEO' ? copy.exercises.video : copy.exercises.image}
                        {item.fileSizeBytes ? ` · ${formatBytes(item.fileSizeBytes)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminStatusBadge status={item.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.status !== 'READY' || openingId !== null}
                      aria-label={interpolate(copy.exercises.openMediaLabel, { name })}
                      onClick={() => void openMedia(item)}
                    >
                      {openingId === item.id ? copy.exercises.opening : copy.common.open}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={interpolate(copy.exercises.deleteMediaLabel, { name })}
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(item);
                      }}
                    >
                      {copy.common.delete}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmSheet
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title={copy.exercises.deleteMediaTitle}
        description={copy.exercises.deleteMediaBody}
        confirmLabel={copy.common.delete}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={remove.isPending}
        danger
        error={deleteError}
        onConfirm={() => void deleteMedia()}
      />
    </AdminSurface>
  );
}
