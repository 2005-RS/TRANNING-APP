import { ClientPlanError } from '@/features/client-subscription/components/client-plan-error';
import { PaymentPendingCard } from '@/features/client-subscription/components/payment-pending-card';
import { PaymentReportForm } from '@/features/client-subscription/components/payment-report-form';
import { PlanStatusCard } from '@/features/client-subscription/components/plan-status-card';
import { SinpeInstructionsCard } from '@/features/client-subscription/components/sinpe-instructions-card';
import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { useClientSubscription } from '@/features/client-subscription/hooks/use-client-subscription';
import { SubscriptionResponseDtoPlan } from '@/generated/models';
import { Alert } from '@/shared/ui/alert';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@/shared/ui/page';

export function ClientPlanPage() {
  const copy = useClientSubscriptionCopy();
  const { subscription, report, invalidate } = useClientSubscription();

  if (subscription.isPending) {
    return <ClientPlanSkeleton />;
  }
  if (subscription.isError || !subscription.data) {
    return (
      <ClientPlanError
        error={subscription.error}
        retrying={subscription.isFetching}
        onRetry={() => void subscription.refetch()}
      />
    );
  }

  const data = subscription.data;
  const isFree = data.plan === SubscriptionResponseDtoPlan.FREE;
  return (
    <PageContainer density="client" className="mx-auto max-w-2xl space-y-5">
      <PageHeader>
        <div>
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.benefits}</PageDescription>
        </div>
      </PageHeader>

      <PlanStatusCard subscription={data} />
      {isFree ? <PlanComparison /> : <PlanIncludes />}
      {data.pendingPayment ? <PaymentPendingCard payment={data.pendingPayment} /> : null}
      {!data.pendingPayment && data.lastRejectedPayment ? (
        <PaymentPendingCard payment={data.lastRejectedPayment} rejected />
      ) : null}

      {!data.pendingPayment ? (
        <>
          {data.sinpe ? (
            <SinpeInstructionsCard sinpe={data.sinpe} isRenewal={!isFree} />
          ) : (
            <Alert>{copy.unavailable}</Alert>
          )}
          {data.sinpe ? (
            <PaymentReportForm
              pending={report.isPending}
              onSubmit={async (values) => {
                await report.mutateAsync({ data: values });
                await invalidate();
              }}
            />
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}

function PlanComparison() {
  const copy = useClientSubscriptionCopy();
  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">{copy.comparisonTitle}</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <FeatureList title={copy.freePlan} items={copy.freeFeatures} />
        <FeatureList title={copy.proPlan} items={copy.proFeatures} />
      </div>
    </Card>
  );
}

function PlanIncludes() {
  const copy = useClientSubscriptionCopy();
  return <FeatureList title={copy.includes} items={copy.proFeatures} />;
}

function FeatureList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className="client-surface-card space-y-3 p-4">
      <h2 className="font-semibold">{title}</h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => <li key={item}>✓ {item}</li>)}
      </ul>
    </section>
  );
}

function ClientPlanSkeleton() {
  const copy = useClientSubscriptionCopy();
  return (
    <PageContainer density="client" className="mx-auto max-w-2xl space-y-5" role="status" aria-label={copy.title}>
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </PageContainer>
  );
}
