import { Skeleton } from '@/shared/ui/skeleton';
import { clientBodyCopy } from '@/features/client-body/copy';

export function BodyProgressSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={clientBodyCopy.loadingLabel}
      className="space-y-5"
    >
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-24 w-full rounded-[1.35rem]" />
        <Skeleton className="h-24 w-full rounded-[1.35rem]" />
      </section>
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="aspect-[3/4] rounded-xl" />
        </div>
      </section>
    </div>
  );
}
