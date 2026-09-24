import { Skeleton } from '@/shared/ui/skeleton';

export function SectionSkeleton({
  label,
  rows = 2,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-4">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-10 w-48 max-w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
