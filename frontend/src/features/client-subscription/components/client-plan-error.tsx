import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { mapApiError } from '@/shared/errors/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/page';

export function ClientPlanError({
  error,
  retrying,
  onRetry,
}: {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const copy = useClientSubscriptionCopy();
  const mapped = mapApiError(error);
  const description = mapped.kind === 'network' ? copy.offline : mapped.description;

  return (
    <PageContainer density="client" className="mx-auto max-w-2xl">
      <Card className="space-y-3 p-5" role="alert">
        <h1 className="text-lg font-semibold">{mapped.title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button disabled={retrying} onClick={onRetry}>
          {retrying ? copy.reporting : copy.submit}
        </Button>
      </Card>
    </PageContainer>
  );
}
