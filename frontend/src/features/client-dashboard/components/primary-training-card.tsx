import { Link } from '@tanstack/react-router';
import { CalendarClock, Dumbbell, LayoutList } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ClientDashboardCurrentWorkoutSessionDto,
  ClientDashboardTrainingPlanDto,
} from '@/generated/models';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  formatCountLabel,
  formatIsoDateTime,
  formatPlanDateRange,
} from '@/features/client-dashboard/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';
import { SectionReveal } from '@/shared/ui/section-reveal';

type PrimaryTrainingCardProps = {
  session: ClientDashboardCurrentWorkoutSessionDto | null | undefined;
  plan: ClientDashboardTrainingPlanDto | null | undefined;
};

export function PrimaryTrainingCard({ session, plan }: PrimaryTrainingCardProps) {
  return (
    <SectionReveal>
      <DashboardCard
        aria-labelledby="primary-training-heading"
        tone={session || plan ? 'hero' : 'hero-calm'}
      >
        {session ? (
          <ActiveSessionContent session={session} planName={plan?.name} />
        ) : plan ? (
          <AssignedPlanContent plan={plan} />
        ) : (
          <NoPlanContent />
        )}
      </DashboardCard>
    </SectionReveal>
  );
}

function IconBadge({
  children,
  calm = false,
}: {
  children: ReactNode;
  calm?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full',
        calm ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary',
      )}
    >
      {children}
    </span>
  );
}

function ActiveSessionContent({
  session,
  planName,
}: {
  session: ClientDashboardCurrentWorkoutSessionDto;
  planName?: string;
}) {
  const clientDashboardCopy = useClientDashboardCopy();
  const started = formatIsoDateTime(session.startedAt);
  const exercises = formatCountLabel(
    session.exerciseCount,
    clientDashboardCopy.primary.exercise,
    clientDashboardCopy.primary.exercises,
  );
  const sets = formatCountLabel(
    session.recordedSetCount,
    clientDashboardCopy.primary.setRecorded,
    clientDashboardCopy.primary.setsRecorded,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3.5">
        <IconBadge>
          <Dumbbell className="size-5" aria-hidden="true" />
        </IconBadge>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            {clientDashboardCopy.primary.inProgressEyebrow}
          </p>
          <h2
            id="primary-training-heading"
            className="text-[1.7rem] font-semibold leading-[1.15] tracking-tight text-foreground"
          >
            {session.workoutName}
          </h2>
          {planName ? (
            <p className="text-sm leading-snug text-muted-foreground">{planName}</p>
          ) : null}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {started ? (
          <li>
            {clientDashboardCopy.primary.started}{' '}
            <span className="text-numeric text-foreground">{started}</span>
          </li>
        ) : null}
        <li>{exercises}</li>
        <li>{sets}</li>
      </ul>
      <Link
        to="/client/workout/$sessionId"
        params={{ sessionId: session.sessionId }}
        className={cn(
          buttonVariants({ size: 'lg' }),
          'min-h-14 w-full transition-transform duration-200 active:scale-[0.98]',
        )}
      >
        {clientDashboardCopy.primary.continueTraining}
      </Link>
    </div>
  );
}

function AssignedPlanContent({ plan }: { plan: ClientDashboardTrainingPlanDto }) {
  const clientDashboardCopy = useClientDashboardCopy();
  const range = formatPlanDateRange(plan.startDate, plan.endDate);
  const workouts = formatCountLabel(
    plan.workoutCount,
    clientDashboardCopy.primary.workout,
    clientDashboardCopy.primary.workouts,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3.5">
        <IconBadge>
          <LayoutList className="size-5" aria-hidden="true" />
        </IconBadge>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            {clientDashboardCopy.primary.planEyebrow}
          </p>
          <h2
            id="primary-training-heading"
            className="text-[1.7rem] font-semibold leading-[1.15] tracking-tight text-foreground"
          >
            {plan.name}
          </h2>
          <p className="text-sm leading-snug text-muted-foreground">
            {workouts}
            {range ? ` · ${range}` : ''}
          </p>
        </div>
      </div>
      <Link
        to="/client/training"
        className={cn(
          buttonVariants({ size: 'lg' }),
          'min-h-14 w-full transition-transform duration-200 active:scale-[0.98]',
        )}
      >
        {clientDashboardCopy.primary.viewTraining}
      </Link>
    </div>
  );
}

function NoPlanContent() {
  const clientDashboardCopy = useClientDashboardCopy();
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3.5">
        <IconBadge calm>
          <CalendarClock className="size-5" aria-hidden="true" />
        </IconBadge>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            {clientDashboardCopy.primary.emptyEyebrow}
          </p>
          <h2
            id="primary-training-heading"
            className="text-[1.5rem] font-semibold leading-snug tracking-tight text-foreground"
          >
            {clientDashboardCopy.primary.emptyTitle}
          </h2>
        </div>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {clientDashboardCopy.primary.emptyBody}
      </p>
    </div>
  );
}
