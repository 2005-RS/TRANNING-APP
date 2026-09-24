import { Skeleton } from '@/shared/ui/skeleton';
import { PageContainer } from '@/shared/ui/page';

export function WorkoutLoadingState({ label }: { label: string }) {
  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <div
        className="space-y-5"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </PageContainer>
  );
}
