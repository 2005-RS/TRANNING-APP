import { Skeleton } from '@/shared/ui/skeleton';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';

export function NutritionSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={clientNutritionCopy.loadingLabel}
      className="space-y-5"
    >
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-5 w-40" />
      </section>
      <section className="client-surface-card space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-40" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-20 w-full rounded-[1.35rem]" />
        <Skeleton className="h-20 w-full rounded-[1.35rem]" />
      </section>
    </div>
  );
}
