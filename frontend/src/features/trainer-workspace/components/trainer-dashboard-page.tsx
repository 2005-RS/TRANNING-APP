import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { TrainerDashboardGetMineInactivityDays } from '@/generated/models';
import { useTrainerDashboardGetMine } from '@/generated/trainer-dashboard/trainer-dashboard';
import { NativeSelect } from '@/features/trainer-workspace/components/workspace-surface';
import { TrainerEmptyState, TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatCount, formatIsoDateTime } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

export function TrainerDashboardPage() {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.dashboard;
  const navigate = useNavigate({ from: '/trainer/dashboard' });
  const search = useSearch({ from: '/trainer/dashboard' });
  const inactivityDays =
    search.inactivityDays ?? TrainerDashboardGetMineInactivityDays.NUMBER_7;
  const query = useTrainerDashboardGetMine(
    { inactivityDays },
    {
      query: {
        staleTime: TRAINER_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
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

  const dashboard = query.data;
  const noClients = dashboard.activeClientCount === 0 && dashboard.disabledAssignedClientCount === 0;
  const pending = dashboard.pendingCheckIns;

  return (
    <PageContainer className="space-y-6">
      <PageHeader className="mb-0">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.description}</PageDescription>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="inactivity-days">{copy.inactivityDays}</Label>
            <NativeSelect
              id="inactivity-days"
              value={inactivityDays}
              onChange={(event) => {
                const next = Number(event.target.value) as TrainerDashboardGetMineInactivityDays;
                void navigate({ search: { inactivityDays: next }, replace: true });
              }}
            >
              <option value={7}>{trainerWorkspaceCopy.clients.days7}</option>
              <option value={14}>{trainerWorkspaceCopy.clients.days14}</option>
              <option value={30}>{trainerWorkspaceCopy.clients.days30}</option>
            </NativeSelect>
          </div>
          <Link to="/trainer/clients" className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
            {copy.viewAllClients}
          </Link>
        </div>
      </PageHeader>

      {noClients ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <WorkspaceSurface
            className={cn('lg:col-span-8', pending.count > 0 && 'border-primary/40')}
            aria-labelledby="pending-checkins-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="pending-checkins-heading" className="text-lg font-semibold tracking-tight">
                  {copy.pendingCheckIns}
                </h2>
                <p className="mt-1 font-mono text-2xl tabular-nums">{pending.count}</p>
              </div>
              <Link
                to="/trainer/check-ins"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
              >
                {copy.viewCheckIns}
              </Link>
            </div>
            {pending.items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{copy.pendingCheckInsEmpty}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {pending.items.map((item) => (
                  <li key={item.checkInId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatIsoDateTime(item.submittedAt)}
                      </p>
                    </div>
                    <Link
                      to="/trainer/clients/$clientId/check-ins/$checkInId"
                      params={{ clientId: item.clientProfileId, checkInId: item.checkInId }}
                      className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}
                    >
                      {copy.reviewCheckIn}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceSurface>

          <WorkspaceSurface className="lg:col-span-4" aria-labelledby="counts-heading">
            <h2 id="counts-heading" className="text-lg font-semibold tracking-tight">
              {copy.countsTitle}
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{copy.activeClients}</dt>
                <dd className="font-mono tabular-nums">{dashboard.activeClientCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{copy.disabledClients}</dt>
                <dd className="font-mono tabular-nums">{dashboard.disabledAssignedClientCount}</dd>
              </div>
            </dl>
          </WorkspaceSurface>

          <AttentionList
            className="lg:col-span-4"
            title={copy.missingTraining}
            count={dashboard.clientsWithoutActiveTrainingPlan.count}
            items={dashboard.clientsWithoutActiveTrainingPlan.items.map((item) => ({
              id: item.clientProfileId,
              name: item.clientName,
              clientId: item.clientProfileId,
              to: '/trainer/clients/$clientId/training' as const,
            }))}
          />
          <AttentionList
            className="lg:col-span-4"
            title={copy.missingNutrition}
            count={dashboard.clientsWithoutActiveNutritionPlan.count}
            items={dashboard.clientsWithoutActiveNutritionPlan.items.map((item) => ({
              id: item.clientProfileId,
              name: item.clientName,
              clientId: item.clientProfileId,
              to: '/trainer/clients/$clientId/nutrition' as const,
            }))}
          />
          <AttentionList
            className="lg:col-span-4"
            title={copy.inactivityTitle}
            hint={copy.inactivityHint}
            count={dashboard.clientsWithoutRecentTraining.count}
            items={dashboard.clientsWithoutRecentTraining.items.map((item) => ({
              id: item.clientProfileId,
              name: item.clientName,
              clientId: item.clientProfileId,
              meta: item.lastCompletedWorkoutAt
                ? formatIsoDateTime(item.lastCompletedWorkoutAt)
                : trainerWorkspaceCopy.clients.never,
              to: '/trainer/clients/$clientId/progress' as const,
            }))}
          />

          <WorkspaceSurface className="lg:col-span-12" aria-labelledby="recent-sessions-heading">
            <h2 id="recent-sessions-heading" className="text-lg font-semibold tracking-tight">
              {copy.recentSessions}
            </h2>
            {dashboard.recentCompletedSessions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{copy.recentSessionsEmpty}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Client</th>
                      <th className="py-2 pr-3 font-medium">Workout</th>
                      <th className="py-2 pr-3 font-medium">Completed</th>
                      <th className="py-2 font-medium">Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentCompletedSessions.map((session) => (
                      <tr key={session.workoutSessionId} className="border-b border-border/70">
                        <td className="py-2.5 pr-3">
                          <Link
                            to="/trainer/clients/$clientId"
                            params={{ clientId: session.clientProfileId }}
                            className="font-medium text-foreground hover:underline"
                          >
                            {session.clientName}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3">{session.workoutName}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-muted-foreground">
                          {formatIsoDateTime(session.completedAt)}
                        </td>
                        <td className="py-2.5 font-mono tabular-nums">
                          {formatCount(session.performedSetCount, copy.sets, copy.sets)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WorkspaceSurface>
        </div>
      )}
    </PageContainer>
  );
}

function AttentionList({
  title,
  count,
  items,
  hint,
  className,
}: {
  title: string;
  count: number;
  hint?: string;
  className?: string;
  items: {
    id: string;
    name: string;
    clientId: string;
    meta?: string | null;
    to:
      | '/trainer/clients/$clientId/training'
      | '/trainer/clients/$clientId/nutrition'
      | '/trainer/clients/$clientId/progress';
  }[];
}) {
  const copy = useTrainerWorkspaceCopy().dashboard;
  return (
    <WorkspaceSurface className={className} aria-labelledby={`${title}-heading`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${title}-heading`} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <p className="font-mono text-lg tabular-nums">{count}</p>
      </div>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.noneInList}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                params={{ clientId: item.clientId }}
                className="flex min-h-10 items-center justify-between gap-3 rounded-md px-1 hover:bg-muted"
              >
                <span className="truncate font-medium">{item.name}</span>
                {item.meta ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceSurface>
  );
}
