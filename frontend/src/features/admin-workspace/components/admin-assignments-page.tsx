import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { TrainerResponseDto } from '@/generated/models';
import { useAdminDashboardGetSystem } from '@/generated/admin-dashboard/admin-dashboard';
import { useClientsList, useClientTrainerAssignmentsGetClientTrainer } from '@/generated/clients/clients';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { AssignmentSheet } from '@/features/admin-workspace/components/assignment-sheet';
import {
  AdminErrorState,
  AdminListEmptyState,
  AdminListSkeleton,
  AdminPageScaffold,
  AdminTableSurface,
  PaginationBar,
  SearchInput,
} from '@/features/admin-workspace/components/admin-primitives';
import { fullName } from '@/features/admin-workspace/lib/formatters';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { formatNumber, interpolate } from '@/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const STALE_TIME_MS = 60_000;

type AssignmentTarget = {
  client: { id: string; name: string; disabled: boolean };
  currentTrainer: TrainerResponseDto | null;
};

export function AdminAssignmentsPage() {
  const copy = useAdminWorkspaceCopy();
  const navigate = useNavigate({ from: '/admin/assignments' });
  const search = useSearch({ from: '/admin/assignments' });
  const [draftSearch, setDraftSearch] = useState(search.search ?? '');
  const [target, setTarget] = useState<AssignmentTarget | null>(null);
  const query = useClientsList(
    { page: search.page ?? 1, limit: PAGE_SIZE, search: search.search, status: 'ACTIVE' },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const summary = useAdminDashboardGetSystem(undefined, {
    query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const filtered = Boolean(search.search);

  function clearFilters() {
    setDraftSearch('');
    void navigate({ search: {}, replace: true });
  }

  return (
    <AdminPageScaffold title={copy.assignments.title} description={copy.assignments.description}>
      {summary.data ? (
        <p className="-mt-3 text-sm text-muted-foreground">
          {interpolate(copy.assignments.summary, {
            assigned: formatNumber(summary.data.currentlyAssignedClients),
            unassigned: formatNumber(summary.data.unassignedActiveClients),
          })}
        </p>
      ) : null}
      <form
        role="search"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ search: { search: draftSearch.trim() || undefined, page: undefined }, replace: true });
        }}
      >
        <SearchInput
          label={copy.clients.searchLabel}
          value={draftSearch}
          placeholder={copy.clients.searchPlaceholder}
          onChange={setDraftSearch}
        />
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
        <AdminListSkeleton label={copy.assignments.loadingLabel} />
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
          emptyTitle={copy.assignments.emptyTitle}
          emptyBody={copy.assignments.emptyBody}
          onClearFilters={clearFilters}
        />
      ) : (
        <>
          <AdminTableSurface>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.assignments.title}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-3 py-3 font-medium sm:px-4">{copy.assignments.client}</th>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-4">{copy.assignments.trainer}</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium sm:px-4">
                    <span className="sr-only">{copy.common.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((client) => (
                  <AssignmentRow
                    key={client.id}
                    clientId={client.id}
                    name={fullName(client.user)}
                    email={client.user.email}
                    onManage={(currentTrainer) =>
                      setTarget({
                        client: { id: client.id, name: fullName(client.user), disabled: false },
                        currentTrainer,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </AdminTableSurface>
          <p className="text-xs text-muted-foreground">{copy.assignments.activeOnlyNote}</p>
          <PaginationBar
            meta={query.data.meta}
            onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
          />
        </>
      )}
      {target ? (
        <AssignmentSheet
          open
          onOpenChange={(open) => {
            if (!open) {
              setTarget(null);
            }
          }}
          client={target.client}
          currentTrainer={target.currentTrainer}
        />
      ) : null}
    </AdminPageScaffold>
  );
}

function AssignmentRow({
  clientId,
  name,
  email,
  onManage,
}: {
  clientId: string;
  name: string;
  email: string;
  onManage: (currentTrainer: TrainerResponseDto | null) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  const assignment = useClientTrainerAssignmentsGetClientTrainer(clientId, {
    query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const trainer = assignment.data?.trainer ?? null;
  return (
    <tr className="border-b border-border/70 last:border-0 hover:bg-muted/40">
      <td className="px-3 py-3 sm:max-w-0 sm:px-4">
        <Link
          to="/admin/clients/$clientId"
          params={{ clientId }}
          className="block break-words font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline sm:truncate"
        >
          {name}
        </Link>
        <span className="hidden truncate text-xs text-muted-foreground sm:block">{email}</span>
      </td>
      <td className="px-3 py-3 sm:max-w-0 sm:px-4" aria-busy={assignment.isPending || undefined}>
        {assignment.isPending ? (
          <Skeleton className="h-5 w-32" aria-label={copy.assignments.loadingTrainer} role="status" />
        ) : assignment.isError ? (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            {copy.assignments.trainerUnavailable}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={copy.retry}
              disabled={assignment.isFetching}
              onClick={() => void assignment.refetch()}
            >
              <RotateCw className="size-4" aria-hidden />
            </Button>
          </span>
        ) : trainer ? (
          <Link
            to="/admin/trainers/$trainerId"
            params={{ trainerId: trainer.id }}
            className="block break-words font-medium text-foreground underline-offset-4 hover:underline sm:truncate"
          >
            {fullName(trainer.user)}
          </Link>
        ) : (
          <Badge variant="outline" className="border-warning/60 text-foreground">
            {copy.clients.unassigned}
          </Badge>
        )}
      </td>
      <td className="px-3 py-3 text-right sm:px-4">
        {assignment.isSuccess ? (
          <Button
            variant={trainer ? 'outline' : 'default'}
            size="sm"
            aria-label={`${trainer ? copy.assignments.change : copy.assignments.assign}: ${name}`}
            onClick={() => onManage(trainer)}
          >
            {trainer ? copy.assignments.change : copy.assignments.assign}
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
