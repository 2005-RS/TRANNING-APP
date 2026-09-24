import { Skeleton } from '@/shared/ui/skeleton';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';

export function CheckInsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={clientCheckInsCopy.loadingLabel}
      className="space-y-5"
    >
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </section>
      <section className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-[1.35rem]" />
        <Skeleton className="h-20 w-full rounded-[1.35rem]" />
      </section>
    </div>
  );
}

export function CheckInDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={clientCheckInsCopy.loadingLabel}
      className="space-y-5"
    >
      <Skeleton className="h-4 w-28" />
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-5 gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </section>
    </div>
  );
}
