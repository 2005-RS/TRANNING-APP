import { lazy, Suspense } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ChartPoint } from '@/features/client-progress/lib/chart-points';

const ProgressLineChart = lazy(() => import('@/features/client-progress/charts/progress-line-chart'));

export function LazyProgressChart({
  points,
  label,
  summary,
}: {
  points: ChartPoint[];
  label: string;
  summary: string;
}) {
  if (points.length < 2) {
    return null;
  }

  return (
    <Suspense fallback={<Skeleton className="mt-4 h-44 w-full rounded-xl sm:h-52" />}>
      <ProgressLineChart points={points} label={label} summary={summary} />
    </Suspense>
  );
}
