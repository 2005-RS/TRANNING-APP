import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { TrainerClientOverviewItemDtoLatestCheckInStatus } from '@/generated/models';
import { useTrainerDashboardListAssignedClients } from '@/generated/trainer-dashboard/trainer-dashboard';
import { NativeSelect } from '@/features/trainer-workspace/components/workspace-surface';
import { PaginationBar } from '@/features/trainer-workspace/components/pagination-bar';
import { TrainerEmptyState, TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatIsoDateTime } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.clients;

function triState(value: boolean | undefined): string {
  if (value === true) {
    return 'true';
  }
  if (value === false) {
    return 'false';
  }
  return '';
}

function parseTri(value: string): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

export function TrainerClientsPage() {
  const navigate = useNavigate({ from: '/trainer/clients' });
  const search = useSearch({ from: '/trainer/clients' });
  const [draft, setDraft] = useState(search.search ?? '');
  const query = useTrainerDashboardListAssignedClients(
    {
      page: search.page ?? 1,
      limit: TRAINER_LIST_PAGE_SIZE,
      search: search.search,
      hasActiveTrainingPlan: search.hasActiveTrainingPlan,
      hasActiveNutritionPlan: search.hasActiveNutritionPlan,
      hasPendingCheckIn: search.hasPendingCheckIn,
      inactivityDays: search.inactivityDays,
    },
    {
      query: {
        staleTime: TRAINER_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  );

  function updateSearch(next: Partial<typeof search>) {
    void navigate({
      search: {
        ...search,
        ...next,
        page: next.page ?? (next.search !== undefined || next.hasActiveTrainingPlan !== undefined || next.hasActiveNutritionPlan !== undefined || next.hasPendingCheckIn !== undefined || next.inactivityDays !== undefined ? 1 : (search.page ?? 1)),
      },
      replace: true,
    });
  }

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

  const { data, meta } = query.data;
  const filteredEmpty = data.length === 0 && (search.search || search.hasActiveTrainingPlan !== undefined || search.hasActiveNutritionPlan !== undefined || search.hasPendingCheckIn !== undefined || search.inactivityDays);
  const empty = data.length === 0 && !filteredEmpty && meta.totalItems === 0;

  return (
    <PageContainer className="space-y-6">
      <PageHeader className="mb-0">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.description}</PageDescription>
        </div>
      </PageHeader>

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          updateSearch({ search: draft.trim() || undefined });
        }}
      >
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="client-search">{copy.searchLabel}</Label>
          <Input
            id="client-search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.searchPlaceholder}
            maxLength={100}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-training">{copy.filterTraining}</Label>
          <NativeSelect
            id="filter-training"
            value={triState(search.hasActiveTrainingPlan)}
            onChange={(event) => updateSearch({ hasActiveTrainingPlan: parseTri(event.target.value) })}
          >
            <option value="">{copy.any}</option>
            <option value="true">{copy.with}</option>
            <option value="false">{copy.without}</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-nutrition">{copy.filterNutrition}</Label>
          <NativeSelect
            id="filter-nutrition"
            value={triState(search.hasActiveNutritionPlan)}
            onChange={(event) => updateSearch({ hasActiveNutritionPlan: parseTri(event.target.value) })}
          >
            <option value="">{copy.any}</option>
            <option value="true">{copy.with}</option>
            <option value="false">{copy.without}</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-checkin">{copy.filterCheckIn}</Label>
          <NativeSelect
            id="filter-checkin"
            value={triState(search.hasPendingCheckIn)}
            onChange={(event) => updateSearch({ hasPendingCheckIn: parseTri(event.target.value) })}
          >
            <option value="">{copy.any}</option>
            <option value="true">{copy.with}</option>
            <option value="false">{copy.without}</option>
          </NativeSelect>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">{trainerWorkspaceCopy.search}</Button>
        </div>
      </form>

      {empty ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : data.length === 0 ? (
        <TrainerEmptyState title={trainerWorkspaceCopy.noResults} body={copy.emptyBody} />
      ) : (
        <>
          <WorkspaceSurface className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">{copy.trainingPlan}</th>
                  <th className="px-4 py-3 font-medium">{copy.nutritionPlan}</th>
                  <th className="px-4 py-3 font-medium">{copy.lastWorkout}</th>
                  <th className="px-4 py-3 font-medium">{copy.checkIn}</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">{copy.open}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.clientProfileId} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{row.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.hasActiveTrainingPlan
                        ? row.currentTrainingPlanName ?? copy.hasPlan
                        : copy.noPlan}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.hasActiveNutritionPlan
                        ? row.currentNutritionPlanName ?? copy.hasPlan
                        : copy.noPlan}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                      {row.lastCompletedWorkoutAt
                        ? formatIsoDateTime(row.lastCompletedWorkoutAt)
                        : copy.never}
                    </td>
                    <td className="px-4 py-3">
                      {row.hasPendingCheckIn ? copy.pendingReview : checkInLabel(row.latestCheckInStatus)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/trainer/clients/$clientId"
                        params={{ clientId: row.clientProfileId }}
                        aria-label={`${copy.open} ${row.clientName}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
                      >
                        {copy.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceSurface>

          <ul className="space-y-3 md:hidden">
            {data.map((row) => (
              <li key={row.clientProfileId}>
                <Link
                  to="/trainer/clients/$clientId"
                  params={{ clientId: row.clientProfileId }}
                  aria-label={`${copy.open} ${row.clientName}`}
                  className="workspace-surface block space-y-2 no-underline"
                >
                  <p className="font-medium text-foreground">{row.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.hasActiveTrainingPlan
                      ? row.currentTrainingPlanName ?? copy.hasPlan
                      : copy.noPlan}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.hasPendingCheckIn ? copy.pendingReview : checkInLabel(row.latestCheckInStatus)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <PaginationBar meta={meta} onPage={(page) => updateSearch({ page })} />
        </>
      )}
    </PageContainer>
  );
}

function checkInLabel(
  status: TrainerClientOverviewItemDtoLatestCheckInStatus | undefined,
): string {
  if (status === TrainerClientOverviewItemDtoLatestCheckInStatus.SUBMITTED) {
    return copy.pendingReview;
  }
  if (status === TrainerClientOverviewItemDtoLatestCheckInStatus.REVIEWED) {
    return trainerWorkspaceCopy.status.REVIEWED;
  }
  return copy.noPending;
}
