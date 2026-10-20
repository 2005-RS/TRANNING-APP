import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Alert } from '@/shared/ui/alert';
import { mapApiError } from '@/shared/errors/api-error';
import { PageContainer, PageHeader, PageTitle } from '@/shared/ui/page';
import { TrainingTabs } from '@/features/workout-session/components/training-tabs';
import { PlanTab } from '@/features/workout-session/components/plan-tab';
import { LibraryTab } from '@/features/workout-session/components/library-tab';
import { HistoryTab } from '@/features/workout-session/components/history-tab';
import { WorkoutLoadingState } from '@/features/workout-session/components/workout-loading-state';
import { WorkoutErrorState } from '@/features/workout-session/components/workout-error-state';
import { workoutCopy } from '@/features/workout-session/copy';
import {
  useCurrentTrainingPlan,
  useCurrentWorkoutSession,
  useWorkoutSessionMutations,
} from '@/features/workout-session/hooks/use-workout-session';
import type { TrainingTab } from '@/features/workout-session/lib/training-search';

export function TrainingHubPage() {
  const navigate = useNavigate({ from: '/client/training' });
  const search = useSearch({ from: '/client/training' }) as { tab?: TrainingTab };
  const currentTab = search.tab ?? 'plan';
  const planQuery = useCurrentTrainingPlan();
  const sessionQuery = useCurrentWorkoutSession();
  const { start } = useWorkoutSessionMutations();
  const [startError, setStartError] = useState<{ title: string; description: string } | null>(null);

  if (planQuery.isPending || sessionQuery.isPending) {
    return <WorkoutLoadingState label={workoutCopy.hub.loadingLabel} />;
  }

  if (planQuery.isError || sessionQuery.isError) {
    return (
      <WorkoutErrorState
        error={planQuery.error ?? sessionQuery.error}
        retrying={false}
        onRetry={() => void planQuery.refetch()}
      />
    );
  }

  const plan = planQuery.data?.trainingPlan ?? null;

  async function startWorkout(id: string) {
    setStartError(null);
    let session;
    try {
      session = await start.mutateAsync({ data: { trainingPlanWorkoutId: id } });
    } catch (error) {
      // Never render backend text: mapApiError returns safe, localized copy.
      const mapped = mapApiError(error);
      setStartError({ title: mapped.title, description: mapped.description });
      return;
    }
    await navigate({
      to: '/client/workout/$sessionId',
      params: { sessionId: session.id },
    });
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <PageHeader>
        <PageTitle>{workoutCopy.hub.title}</PageTitle>
      </PageHeader>
      <div className="space-y-5">
        {startError ? (
          <Alert variant="danger" role="alert">
            <p className="font-medium">{startError.title}</p>
            <p>{startError.description}</p>
          </Alert>
        ) : null}
        <TrainingTabs current={currentTab}>
          {currentTab === 'plan' ? (
            <PlanTab
              plan={plan}
              session={sessionQuery.data?.workoutSession ?? null}
              onStart={(id) => void startWorkout(id)}
            />
          ) : null}
          {currentTab === 'library' ? (
            <LibraryTab trainerPlan={Boolean(plan && !plan.isSelfAuthored)} />
          ) : null}
          {currentTab === 'history' ? <HistoryTab /> : null}
        </TrainingTabs>
      </div>
    </PageContainer>
  );
}
