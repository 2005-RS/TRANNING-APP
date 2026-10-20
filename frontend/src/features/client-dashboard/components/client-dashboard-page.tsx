import { DashboardGreeting } from '@/features/client-dashboard/components/dashboard-greeting';
import { DashboardErrorState } from '@/features/client-dashboard/components/dashboard-error-state';
import { DashboardSkeleton } from '@/features/client-dashboard/components/dashboard-skeleton';
import { TodayCard } from '@/features/client-dashboard/components/today-card';
import { WeeklyActivityCard } from '@/features/client-dashboard/components/weekly-activity-card';
import { ProgressSnapshot } from '@/features/client-dashboard/components/progress-snapshot';
import { NutritionSummaryCard } from '@/features/client-dashboard/components/nutrition-summary-card';
import { CheckInSummaryCard } from '@/features/client-dashboard/components/check-in-summary-card';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { useClientSubscriptionsMe } from '@/generated/subscriptions/subscriptions';
import { SubscriptionResponseDtoPlan } from '@/generated/models';
import { Link } from '@tanstack/react-router';
import { useClientDashboard } from '@/features/client-dashboard/hooks/use-client-dashboard';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';
import { PageContainer } from '@/shared/ui/page';
import { useClientTrainerAssignmentsGetMyTrainer } from '@/generated/clients/clients';
import { TrainerCard } from '@/features/client-dashboard/components/trainer-card';

export function ClientDashboardPage() {
  const query = useClientDashboard();
  const copy = useClientDashboardCopy();
  const subscription = useClientSubscriptionsMe({ query: { retry: false } });
  const trainer = useClientTrainerAssignmentsGetMyTrainer({ query: { retry: false } });

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

        <div className="space-y-5">
          <TodayCard
            session={dashboard.currentWorkoutSession}
            completedSessions={dashboard.recentTraining.completedSessions}
          />
          {subscription.data?.plan === SubscriptionResponseDtoPlan.PRO
            && !trainer.isError
            && trainer.data?.trainer ? <TrainerCard trainer={trainer.data.trainer} /> : null}
          <div className="grid items-start gap-5 sm:grid-cols-2 lg:gap-6">
            <div className="space-y-5">
            <WeeklyActivityCard
              completedSessions={dashboard.recentTraining.completedSessions}
            />
            {subscription.data?.plan === SubscriptionResponseDtoPlan.FREE ? (
              <DashboardCard>
                <h2 className="text-lg font-semibold">{copy.subscription.upgradeTitle}</h2>
                <Link
                  to="/client/plan"
                  className={
                    'inline-flex min-h-10 items-center rounded-md bg-primary px-4 ' +
                    'text-sm font-medium text-primary-foreground'
                  }
                >
                  {copy.subscription.viewPlan}
                </Link>
              </DashboardCard>
            ) : null}
            </div>

            <div className="space-y-5">
              <ProgressSnapshot
                performance={dashboard.performance}
                bodyProgress={dashboard.bodyProgress}
              />
              {dashboard.nutritionPlan ? (
                <NutritionSummaryCard nutritionPlan={dashboard.nutritionPlan} />
              ) : null}
              {/* Check-ins are reviewed by a trainer (Pro). Free clients without one do not see the card. */}
              {subscription.data?.plan !== SubscriptionResponseDtoPlan.FREE || dashboard.checkIn ? (
                <CheckInSummaryCard checkIn={dashboard.checkIn} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
