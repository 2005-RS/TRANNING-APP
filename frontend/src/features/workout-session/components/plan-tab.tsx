import { Link } from '@tanstack/react-router';
import type { TrainingPlanResponseDto, WorkoutSessionResponseDto } from '@/generated/models';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';
import { StaleSessionAlert } from '@/features/workout-session/components/stale-session-alert';
import { workoutCopy } from '@/features/workout-session/copy';
import { useClientSubscriptionsMe } from '@/generated/subscriptions/subscriptions';
import { SubscriptionResponseDtoPlan } from '@/generated/models';
import { formatScheduledDay } from '@/features/workout-session/lib/formatters';
import { nextWorkout } from '@/features/workout-session/lib/next-workout';
import { isStaleSession } from '@/features/workout-session/lib/stale-session';

type PlanTabProps = {
  plan: TrainingPlanResponseDto | null;
  session: WorkoutSessionResponseDto | null;
  onStart: (id: string) => void;
};

export function PlanTab({ plan, session, onStart }: PlanTabProps) {
  return (
    <div className="space-y-5">
      {session ? <ActiveSessionCard session={session} /> : null}
      {plan ? (
        <PlanWorkouts plan={plan} startBlocked={Boolean(session)} onStart={onStart} />
      ) : session ? null : (
        <NoPlanCard />
      )}
    </div>
  );
}

function ActiveSessionCard({ session }: { session: WorkoutSessionResponseDto }) {
  return (
    <section className="client-surface-card space-y-3" aria-labelledby="active-session-heading">
      <p className="text-sm text-muted-foreground">{workoutCopy.hub.inProgressEyebrow}</p>
      <h2 id="active-session-heading" className="text-xl font-semibold">
        {session.workoutName}
      </h2>
      {isStaleSession(session.startedAt) ? <StaleSessionAlert startedAt={session.startedAt} /> : null}
      <Link
        to="/client/workout/$sessionId"
        params={{ sessionId: session.id }}
        className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full')}
      >
        {workoutCopy.hub.continue}
      </Link>
    </section>
  );
}

function NoPlanCard() {
  return (
    <section className="client-surface-card space-y-3" aria-labelledby="no-plan-heading">
      <h2 id="no-plan-heading" className="text-lg font-semibold">
        {workoutCopy.hub.chooseRoutine}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{workoutCopy.hub.libraryIntro}</p>
      <Link
        to="/client/training"
        search={{ tab: 'library' }}
        className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full')}
      >
        {workoutCopy.hub.chooseRoutine}
      </Link>
    </section>
  );
}

function PlanWorkouts({
  plan,
  startBlocked,
  onStart,
}: {
  plan: TrainingPlanResponseDto;
  startBlocked: boolean;
  onStart: (id: string) => void;
}) {
  const upNext = nextWorkout(plan.workouts);
  const subscription = useClientSubscriptionsMe({ query: { retry: false } });
  const showProPrompt = plan.isSelfAuthored
    && !subscription.isError
    && subscription.data?.plan === SubscriptionResponseDtoPlan.FREE;

  return (
    <section className="space-y-3" aria-labelledby="plan-heading">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {plan.isSelfAuthored ? workoutCopy.hub.myRoutine : workoutCopy.hub.coachPlan}
          </p>
          <h2 id="plan-heading" className="truncate text-xl font-semibold">
            {plan.name}
          </h2>
        </div>
        {plan.isSelfAuthored ? (
          <Link
            to="/client/training"
            search={{ tab: 'library' }}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary"
          >
            {workoutCopy.hub.changeRoutine}
          </Link>
        ) : null}
      </div>

      {startBlocked ? (
        <p className="text-sm text-muted-foreground">{workoutCopy.hub.alreadyInProgress}</p>
      ) : null}
      {showProPrompt ? (
        <Link to="/client/plan" className="block rounded-md border border-border p-3 text-sm text-muted-foreground">
          {workoutCopy.hub.proPrompt}
        </Link>
      ) : null}

      {plan.workouts.map((workout) => {
        const isNext = upNext?.id === workout.id;
        return (
          <article
            key={workout.id}
            className={cn('client-surface-card space-y-3', isNext && 'ring-1 ring-primary/60')}
          >
            {isNext ? (
              <p className="text-xs font-medium tracking-wide text-primary uppercase">
                {workoutCopy.hub.today}
              </p>
            ) : null}
            <h3 className="font-semibold">{workout.name}</h3>
            <p className="text-sm text-muted-foreground">
              {workout.exercises.length} {workoutCopy.hub.exercises}
              {workout.scheduledDay ? ` · ${formatScheduledDay(workout.scheduledDay)}` : ''}
            </p>
            <Button
              className="min-h-12 w-full"
              variant={isNext ? 'default' : 'outline'}
              disabled={startBlocked}
              aria-label={workoutCopy.hub.startNamed(workout.name)}
              onClick={() => onStart(workout.id)}
            >
              {workoutCopy.hub.start}
            </Button>
          </article>
        );
      })}
    </section>
  );
}
