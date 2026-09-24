import { Skeleton } from '@/shared/ui/skeleton';
import { PageContainer } from '@/shared/ui/page';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';

export function TrainerSectionSkeleton({
  label,
  rows = 4,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function TrainerPageSkeleton({ label }: { label: string }) {
  return (
    <PageContainer>
      <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <WorkspaceSurface>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="mb-3 h-10 w-full last:mb-0" />
          ))}
        </WorkspaceSurface>
      </div>
    </PageContainer>
  );
}
