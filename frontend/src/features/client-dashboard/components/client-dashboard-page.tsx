import { DashboardGreeting } from '@/features/client-dashboard/components/dashboard-greeting';
import { DashboardErrorState } from '@/features/client-dashboard/components/dashboard-error-state';
import { DashboardSkeleton } from '@/features/client-dashboard/components/dashboard-skeleton';
import { PrimaryTrainingCard } from '@/features/client-dashboard/components/primary-training-card';
import { WeeklyActivityCard } from '@/features/client-dashboard/components/weekly-activity-card';
import { ProgressSnapshot } from '@/features/client-dashboard/components/progress-snapshot';
import { NutritionSummaryCard } from '@/features/client-dashboard/components/nutrition-summary-card';
import { CheckInSummaryCard } from '@/features/client-dashboard/components/check-in-summary-card';
import { useClientDashboard } from '@/features/client-dashboard/hooks/use-client-dashboard';
import { PageContainer } from '@/shared/ui/page';

export function ClientDashboardPage() {
  const query = useClientDashboard();

  if (query.isPending) {
    return <DashboardSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <DashboardErrorState
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

  const dashboard = query.data;

  return (
    <PageContainer density="client" className="mx-auto max-w-5xl xl:max-w-6xl">
      <div className="flex flex-col gap-6 lg:gap-8">
        <DashboardGreeting />

        <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-5 lg:col-span-7">
            <PrimaryTrainingCard
              session={dashboard.currentWorkoutSession}
              plan={dashboard.trainingPlan}
            />
            <WeeklyActivityCard
              completedSessions={dashboard.recentTraining.completedSessions}
            />
          </div>

          <div className="space-y-5 lg:col-span-5">
            <ProgressSnapshot
              performance={dashboard.performance}
              bodyProgress={dashboard.bodyProgress}
            />
            {dashboard.nutritionPlan ? (
              <NutritionSummaryCard nutritionPlan={dashboard.nutritionPlan} />
            ) : null}
            <CheckInSummaryCard checkIn={dashboard.checkIn} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
