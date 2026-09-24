import { Link, Outlet } from '@tanstack/react-router';
import { ClientUserResponseDtoStatus } from '@/generated/models';
import { useTrainerAssignedClientsGetMine } from '@/generated/trainers/trainers';
import { ClientWorkspaceNav } from '@/features/trainer-workspace/components/client-workspace-nav';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { clientDisplayName } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';
import { PageContainer } from '@/shared/ui/page';

export function TrainerClientWorkspaceLayout() {
  const clientId = useTrainerClientId();
  const query = useTrainerAssignedClientsGetMine(clientId, {
    query: {
      enabled: clientId.length > 0,
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });

  if (!clientId || query.isPending) {
    return (
      <PageContainer>
        <WorkspaceSurface>
          <TrainerSectionSkeleton label={trainerWorkspaceCopy.workspace.loadingClient} rows={3} />
        </WorkspaceSurface>
      </PageContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <PageContainer>
        <TrainerErrorState
          error={query.error}
          title={trainerWorkspaceCopy.workspace.notFoundTitle}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
        <p className="mt-4 text-sm text-muted-foreground">{trainerWorkspaceCopy.workspace.notFoundBody}</p>
        <Link to="/trainer/clients" className="mt-4 inline-flex min-h-10 items-center text-sm text-primary">
          {trainerWorkspaceCopy.workspace.backToClients}
        </Link>
      </PageContainer>
    );
  }

  const client = query.data;
  const name = clientDisplayName(client.user.firstName, client.user.lastName);
  const disabled = client.user.status === ClientUserResponseDtoStatus.DISABLED;

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {trainerWorkspaceCopy.workspace.contextLabel}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {disabled ? <StatusBadge status={client.user.status} /> : null}
            <Link
              to="/trainer/clients"
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {trainerWorkspaceCopy.workspace.backToClients}
            </Link>
          </div>
        </div>
        <ClientWorkspaceNav clientId={clientId} />
      </header>
      <Outlet />
    </PageContainer>
  );
}
