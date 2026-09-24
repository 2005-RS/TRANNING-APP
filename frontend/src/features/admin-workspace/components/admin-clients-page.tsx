import { useState } from 'react';
import { ChevronLeft, Edit, Link2, Plus, ShieldCheck, ShieldOff, Unlink } from 'lucide-react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AdminUpdateClientDto, ClientResponseDto, CreateClientDto } from '@/generated/models';
import {
  CreateClientDtoExperienceLevel,
  CreateClientDtoPrimaryGoal,
  UpdateClientStatusDtoStatus,
} from '@/generated/models';
import { getAdminDashboardGetSystemQueryKey } from '@/generated/admin-dashboard/admin-dashboard';
import {
  getClientsGetByIdQueryKey,
  getClientsListQueryKey,
  useClientTrainerAssignmentsGetClientTrainer,
  useClientTrainerAssignmentsListHistory,
  useClientTrainerAssignmentsUnassign,
  useClientsCreate,
  useClientsGetById,
  useClientsList,
  useClientsUpdateById,
  useClientsUpdateStatus,
} from '@/generated/clients/clients';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { ConfirmSheet } from '@/features/admin-workspace/components/confirm-sheet';
import { AdminFormSheet, FormSelectField, FormTextField } from '@/features/admin-workspace/components/admin-form';
import { AssignmentSheet } from '@/features/admin-workspace/components/assignment-sheet';
import { invalidateClientAssignment } from '@/features/admin-workspace/lib/invalidate';
import { adminBackLinkClassName } from '@/features/admin-workspace/lib/ui';
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
import { adminMutationError } from '@/features/admin-workspace/lib/errors';
import { displayDate, displayDateTime, fullName, optionalText } from '@/features/admin-workspace/lib/formatters';
import { clientFormSchema } from '@/features/admin-workspace/lib/schemas';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { interpolate } from '@/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const STALE_TIME_MS = 60_000;
const GOALS = Object.values(CreateClientDtoPrimaryGoal);
const EXPERIENCE = Object.values(CreateClientDtoExperienceLevel);

export function AdminClientsPage() {
  const copy = useAdminWorkspaceCopy();
  const search = useSearch({ from: '/admin/clients' });
  const navigate = useNavigate({ from: '/admin/clients' });
  const [draftSearch, setDraftSearch] = useState(search.search ?? '');
  const [creating, setCreating] = useState(false);
  const query = useClientsList(
    {
      page: search.page ?? 1,
      limit: PAGE_SIZE,
      search: search.search,
      status: search.status,
      primaryGoal: search.primaryGoal,
      experienceLevel: search.experienceLevel,
    },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const filtered = Boolean(search.search || search.status || search.primaryGoal || search.experienceLevel);

  function clearFilters() {
    setDraftSearch('');
    void navigate({ search: {}, replace: true });
  }

  return (
    <AdminPageScaffold
      title={copy.clients.title}
      description={copy.clients.description}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {copy.clients.newClient}
        </Button>
      }
    >
      <form
        role="search"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_10rem_12rem_11rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({
            search: { ...search, search: draftSearch.trim() || undefined, page: undefined },
            replace: true,
          });
        }}
      >
        <SearchInput
          label={copy.clients.searchLabel}
          value={draftSearch}
          placeholder={copy.clients.searchPlaceholder}
          onChange={setDraftSearch}
        />
        <AdminField label={copy.clients.statusFilter}>
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
        <AdminField label={copy.clients.goalFilter}>
          <NativeSelect
            value={search.primaryGoal ?? ''}
            onChange={(event) => {
              const primaryGoal = GOALS.find((goal) => goal === event.target.value);
              void navigate({ search: { ...search, primaryGoal, page: undefined }, replace: true });
            }}
          >
            <option value="">{copy.all}</option>
            {GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {copy.goals[goal]}
              </option>
            ))}
          </NativeSelect>
        </AdminField>
        <AdminField label={copy.clients.experienceFilter}>
          <NativeSelect
            value={search.experienceLevel ?? ''}
            onChange={(event) => {
              const experienceLevel = EXPERIENCE.find((level) => level === event.target.value);
              void navigate({ search: { ...search, experienceLevel, page: undefined }, replace: true });
            }}
          >
            <option value="">{copy.all}</option>
            {EXPERIENCE.map((level) => (
              <option key={level} value={level}>
                {copy.experience[level]}
              </option>
            ))}
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
        <AdminListSkeleton label={copy.clients.loadingLabel} />
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
          emptyTitle={copy.clients.emptyTitle}
          emptyBody={copy.clients.emptyBody}
          onClearFilters={clearFilters}
          emptyActions={<Button onClick={() => setCreating(true)}>{copy.clients.newClient}</Button>}
        />
      ) : (
        <>
          <AdminTableSurface>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.clients.title}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">{copy.common.name}</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    {copy.clients.primaryGoal}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                    {copy.clients.experienceLevel}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:text-left">
                    {copy.common.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((client) => (
                  <tr key={client.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        to="/admin/clients/$clientId"
                        params={{ clientId: client.id }}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {fullName(client.user)}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">{client.user.email}</span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{copy.goals[client.primaryGoal]}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {copy.experience[client.experienceLevel]}
                    </td>
                    <td className="px-4 py-3 text-right sm:text-left">
                      <AdminStatusBadge status={client.user.status} />
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
      <ClientSheet open={creating} onOpenChange={setCreating} mode="create" />
    </AdminPageScaffold>
  );
}

export function AdminClientDetailPage() {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const { clientId } = useParams({ from: '/admin/clients/$clientId' });
  const queryOptions = { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } };
  const clientQuery = useClientsGetById(clientId, queryOptions);
  const assignmentQuery = useClientTrainerAssignmentsGetClientTrainer(clientId, queryOptions);
  const historyQuery = useClientTrainerAssignmentsListHistory(clientId, { limit: 10 }, queryOptions);
  const statusMutation = useClientsUpdateStatus();
  const unassign = useClientTrainerAssignmentsUnassign();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [unassignError, setUnassignError] = useState<string | null>(null);

  if (clientQuery.isPending) {
    return <AdminPageSkeleton label={copy.clients.loadingLabel} />;
  }
  if (clientQuery.isError || !clientQuery.data) {
    return (
      <AdminErrorState
        error={clientQuery.error}
        retrying={clientQuery.isFetching}
        onRetry={() => {
          if (!clientQuery.isFetching) {
            void clientQuery.refetch();
          }
        }}
      />
    );
  }

  const client = clientQuery.data;
  const disabled = client.user.status === 'DISABLED';
  const currentTrainer = assignmentQuery.data?.trainer ?? null;
  const currentHistoryItem = historyQuery.data?.data.find((item) => !item.endedAt);

  async function changeStatus() {
    if (statusMutation.isPending) {
      return;
    }
    setStatusError(null);
    try {
      await statusMutation.mutateAsync({
        id: client.id,
        data: { status: disabled ? UpdateClientStatusDtoStatus.ACTIVE : UpdateClientStatusDtoStatus.DISABLED },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getClientsListQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getClientsGetByIdQueryKey(client.id) }),
        invalidateClientAssignment(queryClient, client.id),
      ]);
      setConfirmStatus(false);
      toast.success(copy.clients.statusToast);
    } catch (err) {
      setStatusError(adminMutationError(err, 'status', copy));
    }
  }

  async function endAssignment() {
    if (unassign.isPending) {
      return;
    }
    setUnassignError(null);
    try {
      await unassign.mutateAsync({ clientId: client.id });
      await invalidateClientAssignment(queryClient, client.id);
      setConfirmUnassign(false);
      toast.success(copy.clients.unassignedToast);
    } catch (err) {
      setUnassignError(adminMutationError(err, 'assignment', copy));
    }
  }

  return (
    <AdminPageScaffold
      title={fullName(client.user)}
      description={client.user.email}
      meta={<AdminStatusBadge status={client.user.status} />}
      backLink={
        <Link to="/admin/clients" className={adminBackLinkClassName}>
          <ChevronLeft className="size-4" aria-hidden />
          {copy.clients.backToList}
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
              setStatusError(null);
              setConfirmStatus(true);
            }}
          >
            {disabled ? <ShieldCheck className="size-4" aria-hidden /> : <ShieldOff className="size-4" aria-hidden />}
            {disabled ? copy.common.activate : copy.common.disable}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <AdminSurface aria-labelledby="client-profile-heading">
          <h2 id="client-profile-heading" className="text-base font-semibold tracking-tight">
            {copy.clients.detailTitle}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label={copy.clients.primaryGoal} value={copy.goals[client.primaryGoal]} />
            <Detail label={copy.clients.experienceLevel} value={copy.experience[client.experienceLevel]} />
            <Detail label={copy.common.phone} value={optionalText(client.phone, copy.notSet)} />
            <Detail
              label={copy.clients.dateOfBirth}
              value={client.dateOfBirth ? displayDate(client.dateOfBirth) : copy.notSet}
            />
            <Detail
              className="sm:col-span-2"
              label={copy.clients.goalNotes}
              value={optionalText(client.goalNotes, copy.notSet)}
            />
            <Detail label={copy.common.created} value={displayDateTime(client.createdAt)} />
            <Detail label={copy.common.updated} value={displayDateTime(client.updatedAt)} />
          </dl>
        </AdminSurface>

        <div className="space-y-4">
          <AdminSurface aria-labelledby="client-assignment-heading">
            <h2 id="client-assignment-heading" className="text-base font-semibold tracking-tight">
              {copy.clients.assignment}
            </h2>
            <div className="mt-4" aria-live="polite">
              {assignmentQuery.isPending ? (
                <div role="status" aria-label={copy.assignments.loadingTrainer} className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : assignmentQuery.isError ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{copy.clients.assignmentUnavailable}</p>
                  <Button variant="outline" size="sm" onClick={() => void assignmentQuery.refetch()}>
                    {copy.retry}
                  </Button>
                </div>
              ) : currentTrainer ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{copy.clients.currentTrainer}</p>
                  <Link
                    to="/admin/trainers/$trainerId"
                    params={{ trainerId: currentTrainer.id }}
                    className="mt-1 inline-block font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {fullName(currentTrainer.user)}
                  </Link>
                  {currentHistoryItem ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {interpolate(copy.clients.assignedSince, { date: displayDateTime(currentHistoryItem.assignedAt) })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{copy.clients.unassigned}</Badge>
                </div>
              )}
            </div>
            {assignmentQuery.isSuccess ? (
              disabled ? (
                <p className="mt-4 text-sm text-muted-foreground">{copy.clients.assignDisabledHint}</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant={currentTrainer ? 'outline' : 'default'} onClick={() => setAssigning(true)}>
                    <Link2 className="size-4" aria-hidden />
                    {currentTrainer ? copy.clients.changeTrainer : copy.clients.assignTrainer}
                  </Button>
                  {currentTrainer ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setUnassignError(null);
                        setConfirmUnassign(true);
                      }}
                    >
                      <Unlink className="size-4" aria-hidden />
                      {copy.clients.removeAssignment}
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
          </AdminSurface>

          <AdminSurface aria-labelledby="client-history-heading">
            <h2 id="client-history-heading" className="text-base font-semibold tracking-tight">
              {copy.assignments.history}
            </h2>
            {historyQuery.isPending ? (
              <Skeleton className="mt-4 h-16" />
            ) : historyQuery.isError ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">{adminMutationError(historyQuery.error, 'status', copy)}</p>
                <Button variant="outline" size="sm" onClick={() => void historyQuery.refetch()}>
                  {copy.retry}
                </Button>
              </div>
            ) : historyQuery.data.data.length ? (
              <ol className="mt-3 divide-y divide-border">
                {historyQuery.data.data.map((item) => (
                  <li key={item.id} className="py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{fullName(item.trainer.user)}</span>
                      <Badge variant={item.endedAt ? 'outline' : 'secondary'}>
                        {item.endedAt ? copy.assignments.pastAssignment : copy.assignments.activeAssignment}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {copy.assignments.assignedAt}: {displayDateTime(item.assignedAt)}
                    </p>
                    {item.endedAt ? (
                      <p className="text-muted-foreground">
                        {copy.assignments.endedAt}: {displayDateTime(item.endedAt)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{copy.clients.historyEmpty}</p>
            )}
          </AdminSurface>
        </div>
      </div>

      <ClientSheet open={editing} onOpenChange={setEditing} mode="edit" client={client} />
      <AssignmentSheet
        open={assigning}
        onOpenChange={setAssigning}
        client={{ id: client.id, name: fullName(client.user), disabled }}
        currentTrainer={currentTrainer}
      />
      <ConfirmSheet
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={disabled ? copy.clients.activateTitle : copy.clients.disableTitle}
        description={disabled ? copy.clients.activateBody : copy.clients.disableBody}
        confirmLabel={disabled ? copy.common.activate : copy.common.disable}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={statusMutation.isPending}
        danger={!disabled}
        error={statusError}
        onConfirm={() => void changeStatus()}
      />
      <ConfirmSheet
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title={copy.clients.removeTitle}
        description={copy.clients.removeBody}
        confirmLabel={copy.clients.removeAssignment}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={unassign.isPending}
        danger
        error={unassignError}
        onConfirm={() => void endAssignment()}
      />
    </AdminPageScaffold>
  );
}

function clientDefaults(client?: ClientResponseDto) {
  return {
    email: client?.user.email ?? '',
    password: '',
    firstName: client?.user.firstName ?? '',
    lastName: client?.user.lastName ?? '',
    phone: client?.phone ?? '',
    dateOfBirth: client?.dateOfBirth?.slice(0, 10) ?? '',
    primaryGoal: client?.primaryGoal ?? CreateClientDtoPrimaryGoal.GENERAL_FITNESS,
    experienceLevel: client?.experienceLevel ?? CreateClientDtoExperienceLevel.BEGINNER,
    goalNotes: client?.goalNotes ?? '',
  } as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    primaryGoal: string;
    experienceLevel: string;
    goalNotes: string;
  };
}

function ClientSheet({
  open,
  onOpenChange,
  mode,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  client?: ClientResponseDto;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const create = useClientsCreate();
  const update = useClientsUpdateById();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: clientDefaults(client),
    validators: { onSubmit: clientFormSchema(copy, mode) },
    onSubmit: async ({ value }) => {
      setError(null);
      const primaryGoal = GOALS.find((goal) => goal === value.primaryGoal) ?? CreateClientDtoPrimaryGoal.GENERAL_FITNESS;
      const experienceLevel =
        EXPERIENCE.find((level) => level === value.experienceLevel) ?? CreateClientDtoExperienceLevel.BEGINNER;
      const phone = value.phone.trim();
      const goalNotes = value.goalNotes.trim();
      const dateOfBirth = value.dateOfBirth.trim();
      try {
        if (mode === 'create') {
          const data: CreateClientDto = {
            email: value.email.trim(),
            password: value.password,
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            phone: phone || undefined,
            dateOfBirth: dateOfBirth || undefined,
            primaryGoal,
            experienceLevel,
            goalNotes: goalNotes || undefined,
          };
          await create.mutateAsync({ data });
          toast.success(copy.clients.createdToast);
        } else if (client) {
          const data: AdminUpdateClientDto = {
            email: value.email.trim(),
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            phone: asOpenApiField<AdminUpdateClientDto['phone']>(phone || null),
            dateOfBirth: asOpenApiField<AdminUpdateClientDto['dateOfBirth']>(dateOfBirth || null),
            primaryGoal,
            experienceLevel,
            goalNotes: asOpenApiField<AdminUpdateClientDto['goalNotes']>(goalNotes || null),
          };
          await update.mutateAsync({ id: client.id, data });
          await queryClient.invalidateQueries({ queryKey: getClientsGetByIdQueryKey(client.id) });
          toast.success(copy.clients.savedToast);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getClientsListQueryKey() }),
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
          title={mode === 'create' ? copy.clients.newClient : copy.clients.editClient}
          description={copy.clients.description}
          error={error}
          submitting={submitting}
          submitLabel={mode === 'create' ? copy.create : copy.save}
          submittingLabel={mode === 'create' ? copy.creating : copy.saving}
          onSubmit={() => void form.handleSubmit()}
        >
          <form.Field name="email">
            {(field) => (
              <FormTextField field={field} id={`client-${mode}-email`} label={copy.common.email} type="email" autoComplete="off" />
            )}
          </form.Field>
          {mode === 'create' ? (
            <form.Field name="password">
              {(field) => (
                <FormTextField
                  field={field}
                  id="client-create-password"
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
              {(field) => <FormTextField field={field} id={`client-${mode}-first-name`} label={copy.common.firstName} />}
            </form.Field>
            <form.Field name="lastName">
              {(field) => <FormTextField field={field} id={`client-${mode}-last-name`} label={copy.common.lastName} />}
            </form.Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="primaryGoal">
              {(field) => (
                <FormSelectField field={field} id={`client-${mode}-goal`} label={copy.clients.primaryGoal}>
                  {GOALS.map((goal) => (
                    <option key={goal} value={goal}>
                      {copy.goals[goal]}
                    </option>
                  ))}
                </FormSelectField>
              )}
            </form.Field>
            <form.Field name="experienceLevel">
              {(field) => (
                <FormSelectField field={field} id={`client-${mode}-experience`} label={copy.clients.experienceLevel}>
                  {EXPERIENCE.map((level) => (
                    <option key={level} value={level}>
                      {copy.experience[level]}
                    </option>
                  ))}
                </FormSelectField>
              )}
            </form.Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="phone">
              {(field) => (
                <FormTextField field={field} id={`client-${mode}-phone`} label={copy.common.phone} type="tel" optional />
              )}
            </form.Field>
            <form.Field name="dateOfBirth">
              {(field) => (
                <FormTextField
                  field={field}
                  id={`client-${mode}-dob`}
                  label={copy.clients.dateOfBirth}
                  type="date"
                  optional
                />
              )}
            </form.Field>
          </div>
          <form.Field name="goalNotes">
            {(field) => (
              <FormTextField field={field} id={`client-${mode}-notes`} label={copy.clients.goalNotes} optional multiline />
            )}
          </form.Field>
        </AdminFormSheet>
      )}
    </form.Subscribe>
  );
}
