import { Link, useParams } from '@tanstack/react-router';
import { useClientTrainingPlansGetMineById } from '@/generated/client-training-plans/client-training-plans';
import type {
  TrainingPlanExerciseResponseDto,
  WorkoutSessionPrescriptionResponseDto,
} from '@/generated/models';
import { formatPlanDateRange } from '@/features/client-dashboard/lib/formatters';
import { WorkoutErrorState } from '@/features/workout-session/components/workout-error-state';
import { WorkoutLoadingState } from '@/features/workout-session/components/workout-loading-state';
import { workoutCopy } from '@/features/workout-session/copy';
import { formatPrescription, formatScheduledDay } from '@/features/workout-session/lib/formatters';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

/** Read-only view of one of the client's previous (archived) training plans. */
export function TrainingPlanHistoryPage() {
  const { planId } = useParams({ from: '/client/training/plans/$planId' });
  const query = useClientTrainingPlansGetMineById(planId);

  if (query.isPending) {
    return <WorkoutLoadingState label={workoutCopy.hub.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <WorkoutErrorState
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const plan = query.data;
  const dates = formatPlanDateRange(plan.startDate, plan.endDate);

  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{workoutCopy.hub.planDetails}</p>
          <PageTitle>{plan.name}</PageTitle>
          {dates ? <PageDescription>{dates}</PageDescription> : null}
        </div>
      </PageHeader>

      <section className="space-y-4" aria-labelledby="archived-workouts">
        <h2 id="archived-workouts" className="text-lg font-semibold">
          {workoutCopy.hub.workouts}
        </h2>
        {plan.workouts.map((workout) => (
          <article key={workout.id} className="client-surface-card space-y-3">
            <div>
              <h3 className="font-semibold">{workout.name}</h3>
              {workout.scheduledDay ? (
                <p className="text-sm text-muted-foreground">
                  {formatScheduledDay(workout.scheduledDay)}
                </p>
              ) : null}
            </div>
            <ul className="space-y-2">
              {workout.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <p className="font-medium">{exercise.exerciseName}</p>
                  <p className="text-sm text-muted-foreground">{formatExercise(exercise)}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <Link
        to="/client/training"
        search={{ tab: 'history' }}
        className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >
        {workoutCopy.hub.backToHistory}
      </Link>
    </PageContainer>
  );
}

function formatExercise(exercise: TrainingPlanExerciseResponseDto) {
  // Plan exercises carry the same prescription fields as session prescriptions.
  return formatPrescription({
    ...exercise,
    type: exercise.prescriptionType,
  } as WorkoutSessionPrescriptionResponseDto);
}
