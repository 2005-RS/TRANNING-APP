import { Link } from '@tanstack/react-router';
import { TrainingPlansListStatus, NutritionPlansListStatus, CheckInsListStatus, WorkoutSessionsListStatus } from '@/generated/models';
import { useTrainerAssignedClientsGetMine } from '@/generated/trainers/trainers';
import { useTrainingPlansList } from '@/generated/training-plans/training-plans';
import { useNutritionPlansList } from '@/generated/nutrition-plans/nutrition-plans';
import { useCheckInsList } from '@/generated/check-ins/check-ins';
import { useWorkoutSessionsList } from '@/generated/workout-sessions/workout-sessions';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import {
  formatIsoDate,
  formatIsoDateTime,
} from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_STALE_TIME_MS, TRAINER_SESSION_PREVIEW_LIMIT } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const copy = trainerWorkspaceCopy.overview;
const workspace = trainerWorkspaceCopy.workspace;

export function TrainerClientOverviewPage() {
  const clientId = useTrainerClientId();
  const clientQuery = useTrainerAssignedClientsGetMine(clientId, {
    query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const trainingQuery = useTrainingPlansList(
    clientId,
    { limit: 5, status: TrainingPlansListStatus.ACTIVE },
    { query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const nutritionQuery = useNutritionPlansList(
    clientId,
    { limit: 5, status: NutritionPlansListStatus.ACTIVE },
    { query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const checkInQuery = useCheckInsList(
    clientId,
    { limit: 5, status: CheckInsListStatus.SUBMITTED },
    { query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const sessionsQuery = useWorkoutSessionsList(
    clientId,
    { limit: TRAINER_SESSION_PREVIEW_LIMIT, status: WorkoutSessionsListStatus.COMPLETED },
    { query: { enabled: Boolean(clientId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );

  if (clientQuery.isPending) {
    return <TrainerSectionSkeleton label={copy.loadingLabel} />;
  }
  if (clientQuery.isError || !clientQuery.data) {
    return (
      <TrainerErrorState
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
  const training = trainingQuery.data?.data[0];
  const nutrition = nutritionQuery.data?.data[0];
  const pendingCheckIn = checkInQuery.data?.data[0];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <WorkspaceSurface className="lg:col-span-5" aria-labelledby="overview-profile-heading">
        <h2 id="overview-profile-heading" className="text-lg font-semibold tracking-tight">
          {copy.snapshot}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label={workspace.goal} value={trainerWorkspaceCopy.goals[client.primaryGoal]} />
          <Row label={workspace.experience} value={trainerWorkspaceCopy.experience[client.experienceLevel]} />
          <Row label={workspace.email} value={client.user.email} />
          {client.phone ? <Row label={workspace.phone} value={client.phone} /> : null}
          {client.goalNotes ? <Row label={workspace.notes} value={client.goalNotes} /> : null}
          <Row label={workspace.memberSince} value={formatIsoDate(client.createdAt)} />
        </dl>
      </WorkspaceSurface>

      <WorkspaceSurface className="lg:col-span-7" aria-labelledby="overview-snapshot-heading">
        <h2 id="overview-snapshot-heading" className="text-lg font-semibold tracking-tight">
          {copy.snapshot}
        </h2>
        <ul className="mt-4 space-y-4">
          <li className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{copy.training}</p>
              <p className="font-medium">{training?.name ?? trainerWorkspaceCopy.clients.noPlan}</p>
            </div>
            <Link
              to="/trainer/clients/$clientId/training"
              params={{ clientId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
            >
              {copy.goTraining}
            </Link>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{copy.nutrition}</p>
              <p className="font-medium">{nutrition?.name ?? trainerWorkspaceCopy.clients.noPlan}</p>
            </div>
            <Link
              to="/trainer/clients/$clientId/nutrition"
              params={{ clientId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
            >
              {copy.goNutrition}
            </Link>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{copy.checkIn}</p>
              <p className="font-medium">
                {pendingCheckIn
                  ? trainerWorkspaceCopy.checkIns.review
                  : trainerWorkspaceCopy.clients.noPending}
              </p>
            </div>
            <Link
              to="/trainer/clients/$clientId/check-ins"
              params={{ clientId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
            >
              {copy.goCheckIns}
            </Link>
          </li>
        </ul>
      </WorkspaceSurface>

      <WorkspaceSurface className="lg:col-span-12" aria-labelledby="overview-sessions-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="overview-sessions-heading" className="text-lg font-semibold tracking-tight">
            {copy.recentSessions}
          </h2>
          <Link
            to="/trainer/clients/$clientId/progress"
            params={{ clientId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {copy.goProgress}
          </Link>
        </div>
        {sessionsQuery.isPending ? (
          <TrainerSectionSkeleton label={copy.loadingLabel} rows={3} />
        ) : sessionsQuery.data?.data.length ? (
          <ul className="mt-4 divide-y divide-border">
            {sessionsQuery.data.data.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{session.workoutName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatIsoDateTime(session.completedAt ?? session.startedAt)}
                  </p>
                </div>
                <StatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.sessionsEmpty}</p>
        )}
      </WorkspaceSurface>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
