import { Button } from '@/shared/ui/button';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { mapApiError } from '@/shared/errors/api-error';

export function NutritionError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const mapped = mapApiError(error);
  const description =
    mapped.description === 'The request could not be completed.'
      ? clientNutritionCopy.error.network
      : mapped.description;

  return (
    <section className="client-surface-card space-y-3" aria-labelledby="nutrition-error-title">
      <h2 id="nutrition-error-title" className="text-lg font-semibold tracking-tight">
        {mapped.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Button className="min-h-12 min-w-36" disabled={retrying} onClick={onRetry}>
        {retrying ? clientNutritionCopy.error.retrying : clientNutritionCopy.error.retry}
      </Button>
    </section>
  );
}
