import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Dumbbell, LayoutList } from 'lucide-react';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { mapApiError } from '@/shared/errors/api-error';
import { formatCountLabel, formatIsoDateTime } from '@/features/client-dashboard/lib/formatters';
import { workoutCopy } from '@/features/workout-session/copy';
import {
  useCurrentTrainingPlan,
  useCurrentWorkoutSession,
  useWorkoutSessionMutations,
} from '@/features/workout-session/hooks/use-workout-session';
import { WorkoutErrorState } from '@/features/workout-session/components/workout-error-state';
import { WorkoutLoadingState } from '@/features/workout-session/components/workout-loading-state';
import { formatScheduledDay } from '@/features/workout-session/lib/formatters';
import { recordedSetCount } from '@/features/workout-session/lib/session-helpers';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';
import type { TrainingPlanWorkoutResponseDto } from '@/generated/models';

export function TrainingHubPage() {
  const navigate = useNavigate();
  const currentSessionQuery = useCurrentWorkoutSession();
  const currentPlanQuery = useCurrentTrainingPlan();
  const { start } = useWorkoutSessionMutations();
  const [startError, setStartError] = useState<unknown>(null);

  const loading = currentSessionQuery.isPending || currentPlanQuery.isPending;
  const failed = currentSessionQuery.isError || currentPlanQuery.isError;

  if (loading) {
    return <WorkoutLoadingState label={workoutCopy.hub.loadingLabel} />;
  }

  if (failed) {
    return (
      <WorkoutErrorState
        error={currentSessionQuery.error ?? currentPlanQuery.error}
        retrying={currentSessionQuery.isFetching || currentPlanQuery.isFetching}
        onRetry={() => {
          if (!currentSessionQuery.isFetching) {
            void currentSessionQuery.refetch();
          }
          if (!currentPlanQuery.isFetching) {
            void currentPlanQuery.refetch();
          }
        }}
      />
    );
  }

  const currentSession = currentSessionQuery.data?.workoutSession ?? null;
  const plan = currentPlanQuery.data?.trainingPlan ?? null;
  const mappedStartError = startError ? mapApiError(startError) : null;

  async function handleStart(workout: TrainingPlanWorkoutResponseDto) {
    setStartError(null);
    try {
      const session = await start.mutateAsync({
        data: { trainingPlanWorkoutId: workout.id },
      });
      await navigate({
        to: '/client/workout/$sessionId',
        params: { sessionId: session.id },
      });
    } catch (error) {
      setStartError(error);
    }
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{workoutCopy.hub.title}</PageTitle>
          <PageDescription>{workoutCopy.hub.description}</PageDescription>
        </div>
      </PageHeader>

      <div className="space-y-5">
        {currentSession ? (
          <section className="client-surface-card dashboard-hero-card dashboard-hero-card--action space-y-5">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Dumbbell className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">
                  {workoutCopy.hub.inProgressEyebrow}
                </p>
                <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight">
                  {currentSession.workoutName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {workoutCopy.hub.started}{' '}
                  <span className="text-numeric text-foreground">
                    {formatIsoDateTime(currentSession.startedAt) ?? ''}
                  </span>
                  {' · '}
                  {formatCountLabel(
                    recordedSetCount(currentSession),
                    workoutCopy.hub.setRecorded,
                    workoutCopy.hub.setsRecorded,
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/client/workout/$sessionId"
              params={{ sessionId: currentSession.id }}
              className={cn(buttonVariants({ size: 'lg' }), 'min-h-14 w-full')}
            >
              {workoutCopy.hub.continue}
            </Link>
          </section>
        ) : null}

        {mappedStartError ? (
          <Alert variant="danger">
            <p className="font-medium">{mappedStartError.title}</p>
            <p className="mt-1 text-muted-foreground">{mappedStartError.description}</p>
            {currentSession ? (
              <Link
                to="/client/workout/$sessionId"
                params={{ sessionId: currentSession.id }}
                className="mt-3 inline-flex min-h-12 items-center font-medium underline-offset-4 hover:underline"
              >
                {workoutCopy.hub.continue}
              </Link>
            ) : null}
          </Alert>
        ) : null}

        {plan ? (
          <section className="space-y-3" aria-labelledby="plan-workouts-heading">
            <div className="flex items-start gap-3 px-1">
              <LayoutList className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {workoutCopy.hub.planEyebrow}
                </p>
                <h2 id="plan-workouts-heading" className="text-lg font-semibold tracking-tight">
                  {plan.name}
                </h2>
              </div>
            </div>
            {currentSession ? (
              <p className="px-1 text-sm text-muted-foreground">
                {workoutCopy.hub.alreadyInProgress}
              </p>
            ) : null}
            <ul className="space-y-3">
              {plan.workouts.map((workout) => {
                const day = formatScheduledDay(workout.scheduledDay);
                const exercises = formatCountLabel(
                  workout.exercises.length,
                  workoutCopy.hub.exercise,
                  workoutCopy.hub.exercises,
                );
                return (
                  <li key={workout.id} className="client-surface-card space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-tight">{workout.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {exercises}
                        {day ? ` · ${day}` : ''}
                      </p>
                    </div>
                    <Button
                      className="min-h-14 w-full"
                      disabled={Boolean(currentSession) || start.isPending}
                      aria-label={workoutCopy.hub.startNamed(workout.name)}
                      onClick={() => {
                        void handleStart(workout);
                      }}
                    >
                      {workoutCopy.hub.start}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="client-surface-card space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {workoutCopy.hub.emptyTitle}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {workoutCopy.hub.emptyBody}
            </p>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
