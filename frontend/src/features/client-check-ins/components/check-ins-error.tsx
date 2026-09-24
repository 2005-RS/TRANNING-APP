import { Button } from '@/shared/ui/button';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { mapCheckInError } from '@/features/client-check-ins/lib/map-error';

export function CheckInsError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const mapped = mapCheckInError(error);

  return (
    <section className="client-surface-card space-y-3" aria-labelledby="check-ins-error-title">
      <h2 id="check-ins-error-title" className="text-lg font-semibold tracking-tight">
        {mapped.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{mapped.description}</p>
      <Button className="min-h-12 min-w-36" disabled={retrying} onClick={onRetry}>
        {retrying ? clientCheckInsCopy.error.retrying : clientCheckInsCopy.error.retry}
      </Button>
    </section>
  );
}
