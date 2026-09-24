import { Button } from '@/shared/ui/button';
import { clientProgressCopy } from '@/features/client-progress/copy';
import { mapApiError } from '@/shared/errors/api-error';

export function SectionError({
  error,
  onRetry,
  retrying,
  title,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  title?: string;
}) {
  const mapped = mapApiError(error);
  const description =
    mapped.description === 'The request could not be completed.'
      ? clientProgressCopy.error.network
      : mapped.description;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {title ?? mapped.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Button
        className="min-h-12 min-w-36"
        disabled={retrying}
        onClick={onRetry}
      >
        {retrying ? clientProgressCopy.error.retrying : clientProgressCopy.error.retry}
      </Button>
    </div>
  );
}
