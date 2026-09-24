import { Link } from '@tanstack/react-router';
import { useTrainerDashboardGetMine } from '@/generated/trainer-dashboard/trainer-dashboard';
import { TrainerEmptyState, TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatIsoDateTime, formatPeriodRange } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.checkIns;

export function TrainerCheckInsQueuePage() {
  const query = useTrainerDashboardGetMine(undefined, {
    query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });

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

  const items = query.data.pendingCheckIns.items;

  return (
    <PageContainer className="space-y-6">
      <PageHeader className="mb-0">
        <div className="space-y-2">
          <PageTitle>{copy.queueTitle}</PageTitle>
          <PageDescription>{copy.queueDescription}</PageDescription>
        </div>
      </PageHeader>
      {items.length === 0 ? (
        <TrainerEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <WorkspaceSurface className="p-0">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.checkInId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPeriodRange(item.periodStart, item.periodEnd)} · {formatIsoDateTime(item.submittedAt)}
                  </p>
                </div>
                <Link
                  to="/trainer/clients/$clientId/check-ins/$checkInId"
                  params={{ clientId: item.clientProfileId, checkInId: item.checkInId }}
                  className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}
                >
                  {copy.open}
                </Link>
              </li>
            ))}
          </ul>
        </WorkspaceSurface>
      )}
    </PageContainer>
  );
}
