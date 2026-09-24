import { Link } from '@tanstack/react-router';
import { CheckInsListStatus } from '@/generated/models';
import { useCheckInsList } from '@/generated/check-ins/check-ins';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerEmptyState, TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatIsoDateTime, formatPeriodRange } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.checkIns;

export function TrainerClientCheckInsPage() {
  const clientId = useTrainerClientId();
  const query = useCheckInsList(
    clientId,
    { limit: TRAINER_LIST_PAGE_SIZE },
    {
      query: {
        enabled: Boolean(clientId),
        staleTime: TRAINER_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  );

  if (query.isPending) {
    return (
      <WorkspaceSurface>
        <TrainerSectionSkeleton label={copy.loadingLabel} />
      </WorkspaceSurface>
    );
  }
  if (query.isError || !query.data) {
    return (
      <TrainerErrorState
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

  const rows = query.data.data.filter((item) => item.status !== 'DRAFT');

  if (rows.length === 0) {
    return <TrainerEmptyState title={copy.emptyTitle} body={copy.clientEmpty} />;
  }

  return (
    <WorkspaceSurface className="p-0" aria-labelledby="client-checkins-heading">
      <h2 id="client-checkins-heading" className="sr-only">
        {copy.title}
      </h2>
      <ul className="divide-y divide-border">
        {rows.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{formatPeriodRange(item.periodStart, item.periodEnd)}</p>
              <p className="text-sm text-muted-foreground">
                {item.submittedAt ? formatIsoDateTime(item.submittedAt) : copy.submitted}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={item.status} />
              <Link
                to="/trainer/clients/$clientId/check-ins/$checkInId"
                params={{ clientId, checkInId: item.id }}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
              >
                {item.status === CheckInsListStatus.SUBMITTED ? copy.review : copy.open}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </WorkspaceSurface>
  );
}
