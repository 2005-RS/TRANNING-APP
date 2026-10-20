import { Link } from '@tanstack/react-router';
import { useClientWorkoutSessionsListMine } from '@/generated/client-workout-sessions/client-workout-sessions';
import { useClientTrainingPlansListMine } from '@/generated/client-training-plans/client-training-plans';
import {
  ClientTrainingPlansListMineStatus,
  WorkoutSessionSummaryResponseDtoStatus,
} from '@/generated/models';
import { formatPlanDateRange } from '@/features/client-dashboard/lib/formatters';
import { workoutCopy } from '@/features/workout-session/copy';
import { formatInstant } from '@/i18n/format';
import { Spinner } from '@/shared/ui/spinner';

export function HistoryTab() {
  const sessions = useClientWorkoutSessionsListMine({
    status: WorkoutSessionSummaryResponseDtoStatus.COMPLETED,
    limit: 10,
  });
  const plans = useClientTrainingPlansListMine({
    status: ClientTrainingPlansListMineStatus.ARCHIVED,
    limit: 20,
  });

  if (sessions.isPending || plans.isPending) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label={workoutCopy.hub.loadingLabel}>
        <Spinner />
      </div>
    );
  }

  const completed = sessions.data?.data ?? [];
  const previousPlans = plans.data?.data ?? [];

  return (
    <div className="space-y-7">
      <section className="space-y-3" aria-labelledby="completed-workouts">
        <h2 id="completed-workouts" className="text-lg font-semibold">
          {workoutCopy.hub.completedWorkouts}
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{workoutCopy.hub.historyEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {completed.map((session) => (
              <li key={session.id} className="client-surface-card">
                <Link
                  to="/client/workout/$sessionId"
                  params={{ sessionId: session.id }}
                  className="block min-h-11"
                >
                  <p className="font-semibold">{session.workoutName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatInstant(session.completedAt ?? session.startedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="previous-training-plans">
        <h2 id="previous-training-plans" className="text-lg font-semibold">
          {workoutCopy.hub.previousPlans}
        </h2>
        {previousPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{workoutCopy.hub.previousPlansEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {previousPlans.map((plan) => (
              <li key={plan.id} className="client-surface-card">
                <Link
                  to="/client/training/plans/$planId"
                  params={{ planId: plan.id }}
                  className="block min-h-11"
                >
                  <p className="font-semibold">{plan.name}</p>
                  {formatPlanDateRange(plan.startDate, plan.endDate) ? (
                    <p className="text-sm text-muted-foreground">
                      {formatPlanDateRange(plan.startDate, plan.endDate)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.isSelfAuthored ? workoutCopy.hub.myRoutine : workoutCopy.hub.coachPlan}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
