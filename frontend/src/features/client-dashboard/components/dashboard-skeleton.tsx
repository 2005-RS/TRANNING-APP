import { Skeleton } from '@/shared/ui/skeleton';
import { PageContainer } from '@/shared/ui/page';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';

export function DashboardSkeleton() {
  const clientDashboardCopy = useClientDashboardCopy();
  return (
    <PageContainer density="client" className="mx-auto max-w-5xl xl:max-w-6xl">
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-label={clientDashboardCopy.loadingLabel}
      >
        <div className="space-y-3 pt-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-56 max-w-full" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    </PageContainer>
  );
}
