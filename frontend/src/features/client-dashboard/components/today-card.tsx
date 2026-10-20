import { Link, useNavigate } from '@tanstack/react-router';
import { CalendarCheck, Dumbbell, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ClientDashboardCompletedSessionDto,
  ClientDashboardCurrentWorkoutSessionDto,
} from '@/generated/models';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';
import { workoutCopy } from '@/features/workout-session/copy';
import {
  useCurrentTrainingPlan,
  useWorkoutSessionMutations,
} from '@/features/workout-session/hooks/use-workout-session';
import { nextWorkout } from '@/features/workout-session/lib/next-workout';
import { isStaleSession, staleSessionDays } from '@/features/workout-session/lib/stale-session';

type TodayCardProps = {
  session: ClientDashboardCurrentWorkoutSessionDto | null | undefined;
  completedSessions: ClientDashboardCompletedSessionDto[];
};

/**
 * "Hoy": the single primary action on Home.
 * 1. a session in progress → continue it;
 * 2. an active plan → the workout that is up next → start it;
 * 3. no plan → choose a routine from the library.
 */
export function TodayCard({ session, completedSessions }: TodayCardProps) {
  const copy = useClientDashboardCopy();
  const navigate = useNavigate({ from: '/client/dashboard' });
  const planQuery = useCurrentTrainingPlan();
  const { start } = useWorkoutSessionMutations();

  if (session) {
    return (
      <TodayShell eyebrow={copy.primary.inProgressEyebrow} icon={<Dumbbell aria-hidden />}>
        <h2 id="today-heading" className="text-2xl font-semibold tracking-tight">
          {session.workoutName}
        </h2>
        {isStaleSession(session.startedAt) ? (
          <Alert>{workoutCopy.focus.staleSession(staleSessionDays(session.startedAt))}</Alert>
        ) : null}
        <Link
          to="/client/workout/$sessionId"
          params={{ sessionId: session.sessionId }}
          className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full')}
        >
          {copy.primary.continueTraining}
        </Link>
      </TodayShell>
    );
  }

  const plan = planQuery.data?.trainingPlan ?? null;
  const workouts = plan?.workouts ?? [];
  // Completed sessions carry the workout name only; match it back to the plan workout.
  const completedInOrder = [...completedSessions]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .flatMap((done) => {
      const match = workouts.find((workout) => workout.name === done.workoutName);
      return match ? [{ sourceTrainingPlanWorkoutId: match.id }] : [];
    });
  const upNext = nextWorkout(workouts, completedInOrder);

  async function begin(workoutId: string) {
    const created = await start.mutateAsync({ data: { trainingPlanWorkoutId: workoutId } });
    await navigate({
      to: '/client/workout/$sessionId',
      params: { sessionId: created.id },
    });
  }

  if (plan && upNext) {
    return (
      <TodayShell eyebrow={plan.name} icon={<CalendarCheck aria-hidden />}>
        <p className="text-sm text-muted-foreground">{copy.today.upNext}</p>
        <h2 id="today-heading" className="text-2xl font-semibold tracking-tight">
          {upNext.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {copy.today.exerciseCount(upNext.exercises.length)}
        </p>
        <Button
          size="lg"
          className="min-h-12 w-full"
          disabled={start.isPending}
          onClick={() => void begin(upNext.id)}
        >
          {workoutCopy.hub.start}
        </Button>
        <Link
          to="/client/training"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
        >
          {copy.primary.viewTraining}
        </Link>
      </TodayShell>
    );
  }

  return (
    <TodayShell eyebrow={workoutCopy.hub.today} icon={<Sparkles aria-hidden />}>
      <h2 id="today-heading" className="text-2xl font-semibold tracking-tight">
        {copy.today.emptyTitle}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.today.emptyBody}</p>
      <Link
        to="/client/training"
        search={{ tab: 'library' }}
        className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full')}
      >
        {workoutCopy.hub.chooseRoutine}
      </Link>
    </TodayShell>
  );
}

function TodayShell({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardCard aria-labelledby="today-heading" tone="hero">
      <div className="flex flex-col gap-3">
        <p
          className={
            'flex items-center gap-2 text-xs font-medium tracking-wide ' +
            'text-muted-foreground uppercase [&_svg]:size-4'
          }
        >
          {icon}
          {eyebrow}
        </p>
        {children}
      </div>
    </DashboardCard>
  );
}
