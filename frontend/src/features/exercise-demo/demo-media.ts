export type ExerciseDemoLabels = {
  play: string;
  pause: string;
  loading: string;
  empty: string;
  failed: string;
  retry: string;
};

export function pickReadyDemonstration<T extends { status: string; mediaType: string; displayOrder: number }>(
  items: T[] | undefined,
): T | null {
  const ready = (items ?? [])
    .filter((item) => item.status === 'READY')
    .sort((left, right) => left.displayOrder - right.displayOrder);
  return (
    ready.find((item) => item.mediaType === 'VIDEO') ??
    ready[0] ??
    null
  );
}
