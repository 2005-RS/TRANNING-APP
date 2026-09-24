import { useState } from 'react';
import { ChevronLeft, Edit, Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AdminUpdateTrainerDto, CreateTrainerDto, TrainerResponseDto } from '@/generated/models';
import { UpdateTrainerStatusDtoStatus } from '@/generated/models';
import { getAdminDashboardGetSystemQueryKey } from '@/generated/admin-dashboard/admin-dashboard';
import {
  getTrainersGetByIdQueryKey,
  getTrainersListQueryKey,
  useTrainersCreate,
  useTrainersGetById,
  useTrainersList,
  useTrainersUpdateById,
  useTrainersUpdateStatus,
} from '@/generated/trainers/trainers';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { ConfirmSheet } from '@/features/admin-workspace/components/confirm-sheet';
import { AdminFormSheet, FormTextField } from '@/features/admin-workspace/components/admin-form';
import {
  AdminErrorState,
  AdminField,
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
import { adminBackLinkClassName } from '@/features/admin-workspace/lib/ui';
import { adminMutationError } from '@/features/admin-workspace/lib/errors';
import { displayDateTime, fullName, optionalText } from '@/features/admin-workspace/lib/formatters';
import { trainerFormSchema } from '@/features/admin-workspace/lib/schemas';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { Button } from '@/shared/ui/button';

const STALE_TIME_MS = 60_000;

export function AdminTrainersPage() {
  const copy = useAdminWorkspaceCopy();
  const search = useSearch({ from: '/admin/trainers' });
  const navigate = useNavigate({ from: '/admin/trainers' });
  const [draftSearch, setDraftSearch] = useState(search.search ?? '');
  const [creating, setCreating] = useState(false);
  const query = useTrainersList(
    {
      page: search.page ?? 1,
      limit: PAGE_SIZE,
      search: search.search,
      status: search.status,
    },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const filtered = Boolean(search.search || search.status);

  function clearFilters() {
    setDraftSearch('');
    void navigate({ search: {}, replace: true });
  }

  return (
    <AdminPageScaffold
      title={copy.trainers.title}
      description={copy.trainers.description}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {copy.trainers.newTrainer}
        </Button>
      }
    >
      <form
        role="search"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_12rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({
            search: { ...search, search: draftSearch.trim() || undefined, page: undefined },
            replace: true,
          });
        }}
      >
        <SearchInput
          label={copy.trainers.searchLabel}
          value={draftSearch}
          placeholder={copy.trainers.searchPlaceholder}
          onChange={setDraftSearch}
        />
        <AdminField label={copy.trainers.statusFilter}>
          <NativeSelect
            value={search.status ?? ''}
            onChange={(event) => {
              const status =
                event.target.value === 'ACTIVE' || event.target.value === 'DISABLED'
                  ? event.target.value
                  : undefined;
              void navigate({ search: { ...search, status, page: undefined }, replace: true });
            }}
          >
            <option value="">{copy.all}</option>
            <option value="ACTIVE">{copy.status.ACTIVE}</option>
            <option value="DISABLED">{copy.status.DISABLED}</option>
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
        <AdminListSkeleton label={copy.trainers.loadingLabel} />
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
          emptyTitle={copy.trainers.emptyTitle}
          emptyBody={copy.trainers.emptyBody}
          onClearFilters={clearFilters}
          emptyActions={<Button onClick={() => setCreating(true)}>{copy.trainers.newTrainer}</Button>}
        />
      ) : (
        <>
          <AdminTableSurface>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.trainers.title}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">{copy.common.name}</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    {copy.trainers.professionalTitle}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:text-left">
                    {copy.common.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((trainer) => (
                  <tr key={trainer.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        to="/admin/trainers/$trainerId"
                        params={{ trainerId: trainer.id }}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {fullName(trainer.user)}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">{trainer.user.email}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {optionalText(trainer.professionalTitle, copy.notSet)}
                    </td>
                    <td className="px-4 py-3 text-right sm:text-left">
                      <AdminStatusBadge status={trainer.user.status} />
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
      <TrainerSheet open={creating} onOpenChange={setCreating} mode="create" />
    </AdminPageScaffold>
  );
}

export function AdminTrainerDetailPage() {
  const copy = useAdminWorkspaceCopy();
  const { trainerId } = useParams({ from: '/admin/trainers/$trainerId' });
  const queryClient = useQueryClient();
  const updateStatus = useTrainersUpdateStatus();
  const query = useTrainersGetById(trainerId, {
    query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (query.isPending) {
    return <AdminPageSkeleton label={copy.trainers.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <AdminErrorState
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

  const trainer = query.data;
  const disabled = trainer.user.status === 'DISABLED';
  async function changeStatus() {
    if (updateStatus.isPending) {
      return;
    }
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        id: trainer.id,
        data: {
          status: disabled ? UpdateTrainerStatusDtoStatus.ACTIVE : UpdateTrainerStatusDtoStatus.DISABLED,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getTrainersListQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getTrainersGetByIdQueryKey(trainer.id) }),
        queryClient.invalidateQueries({ queryKey: getAdminDashboardGetSystemQueryKey() }),
      ]);
      setConfirmStatus(false);
      toast.success(copy.trainers.statusToast);
    } catch (err) {
      setActionError(adminMutationError(err, 'status', copy));
    }
  }

  return (
    <AdminPageScaffold
      title={fullName(trainer.user)}
      description={trainer.user.email}
      meta={<AdminStatusBadge status={trainer.user.status} />}
      backLink={
        <Link to="/admin/trainers" className={adminBackLinkClassName}>
          <ChevronLeft className="size-4" aria-hidden />
          {copy.trainers.backToList}
        </Link>
      }
      actions={
        <>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="size-4" aria-hidden />
            {copy.common.edit}
          </Button>
          <Button
            variant={disabled ? 'default' : 'outline'}
            onClick={() => {
              setActionError(null);
              setConfirmStatus(true);
            }}
          >
            {disabled ? <ShieldCheck className="size-4" aria-hidden /> : <ShieldOff className="size-4" aria-hidden />}
            {disabled ? copy.common.activate : copy.common.disable}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AdminSurface aria-labelledby="trainer-profile-heading">
          <h2 id="trainer-profile-heading" className="text-base font-semibold tracking-tight">
            {copy.trainers.detailTitle}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label={copy.common.phone} value={optionalText(trainer.phone, copy.notSet)} />
            <Detail
              label={copy.trainers.professionalTitle}
              value={optionalText(trainer.professionalTitle, copy.notSet)}
            />
            <Detail
              className="sm:col-span-2"
              label={copy.trainers.bio}
              value={optionalText(trainer.bio, copy.notSet)}
            />
            <Detail label={copy.common.created} value={displayDateTime(trainer.createdAt)} />
            <Detail label={copy.common.updated} value={displayDateTime(trainer.updatedAt)} />
          </dl>
        </AdminSurface>
        <AdminSurface aria-labelledby="trainer-clients-heading" className="self-start">
          <h2 id="trainer-clients-heading" className="text-base font-semibold tracking-tight">
            {copy.assignments.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.trainers.assignedClientsNote}</p>
          <Link
            to="/admin/assignments"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {copy.assignments.title}
          </Link>
        </AdminSurface>
      </div>
      <TrainerSheet open={editing} onOpenChange={setEditing} mode="edit" trainer={trainer} />
      <ConfirmSheet
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={disabled ? copy.trainers.activateTitle : copy.trainers.disableTitle}
        description={disabled ? copy.trainers.activateBody : copy.trainers.disableBody}
        confirmLabel={disabled ? copy.common.activate : copy.common.disable}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={updateStatus.isPending}
        danger={!disabled}
        error={actionError}
        onConfirm={() => void changeStatus()}
      />
    </AdminPageScaffold>
  );
}

function trainerDefaults(trainer?: TrainerResponseDto) {
  return {
    email: trainer?.user.email ?? '',
    password: '',
    firstName: trainer?.user.firstName ?? '',
    lastName: trainer?.user.lastName ?? '',
    phone: trainer?.phone ?? '',
    professionalTitle: trainer?.professionalTitle ?? '',
    bio: trainer?.bio ?? '',
  };
}

function TrainerSheet({
  open,
  onOpenChange,
  mode,
  trainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  trainer?: TrainerResponseDto;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const create = useTrainersCreate();
  const update = useTrainersUpdateById();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: trainerDefaults(trainer),
    validators: { onSubmit: trainerFormSchema(copy, mode) },
    onSubmit: async ({ value }) => {
      setError(null);
      const email = value.email.trim();
      const firstName = value.firstName.trim();
      const lastName = value.lastName.trim();
      const phone = value.phone.trim();
      const professionalTitle = value.professionalTitle.trim();
      const bio = value.bio.trim();
      try {
        if (mode === 'create') {
          const data: CreateTrainerDto = {
            email,
            password: value.password,
            firstName,
            lastName,
            phone: phone || undefined,
            professionalTitle: professionalTitle || undefined,
            bio: bio || undefined,
          };
          await create.mutateAsync({ data });
          toast.success(copy.trainers.createdToast);
        } else if (trainer) {
          const data: AdminUpdateTrainerDto = {
            email,
            firstName,
            lastName,
            phone: asOpenApiField<AdminUpdateTrainerDto['phone']>(phone || null),
            professionalTitle: asOpenApiField<AdminUpdateTrainerDto['professionalTitle']>(professionalTitle || null),
            bio: asOpenApiField<AdminUpdateTrainerDto['bio']>(bio || null),
          };
          await update.mutateAsync({ id: trainer.id, data });
          await queryClient.invalidateQueries({ queryKey: getTrainersGetByIdQueryKey(trainer.id) });
          toast.success(copy.trainers.savedToast);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getTrainersListQueryKey() }),
          mode === 'create'
            ? queryClient.invalidateQueries({ queryKey: getAdminDashboardGetSystemQueryKey() })
            : Promise.resolve(),
        ]);
        form.reset();
        onOpenChange(false);
      } catch (err) {
        setError(adminMutationError(err, 'account', copy));
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
          title={mode === 'create' ? copy.trainers.newTrainer : copy.trainers.editTrainer}
          description={copy.trainers.description}
          error={error}
          submitting={submitting}
          submitLabel={mode === 'create' ? copy.create : copy.save}
          submittingLabel={mode === 'create' ? copy.creating : copy.saving}
          onSubmit={() => void form.handleSubmit()}
        >
          <form.Field name="email">
            {(field) => (
              <FormTextField
                field={field}
                id={`trainer-${mode}-email`}
                label={copy.common.email}
                type="email"
                autoComplete="off"
              />
            )}
          </form.Field>
          {mode === 'create' ? (
            <form.Field name="password">
              {(field) => (
                <FormTextField
                  field={field}
                  id="trainer-create-password"
                  label={copy.common.password}
                  type="password"
                  autoComplete="new-password"
                  hint={copy.common.passwordHint}
                />
              )}
            </form.Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="firstName">
              {(field) => (
                <FormTextField field={field} id={`trainer-${mode}-first-name`} label={copy.common.firstName} />
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <FormTextField field={field} id={`trainer-${mode}-last-name`} label={copy.common.lastName} />
              )}
            </form.Field>
          </div>
          <form.Field name="phone">
            {(field) => (
              <FormTextField
                field={field}
                id={`trainer-${mode}-phone`}
                label={copy.common.phone}
                type="tel"
                optional
              />
            )}
          </form.Field>
          <form.Field name="professionalTitle">
            {(field) => (
              <FormTextField
                field={field}
                id={`trainer-${mode}-title`}
                label={copy.trainers.professionalTitle}
                optional
              />
            )}
          </form.Field>
          <form.Field name="bio">
            {(field) => (
              <FormTextField field={field} id={`trainer-${mode}-bio`} label={copy.trainers.bio} optional multiline />
            )}
          </form.Field>
        </AdminFormSheet>
      )}
    </form.Subscribe>
  );
}
