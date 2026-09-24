import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';
import { mapApiError } from '@/shared/errors/api-error';

export function DashboardErrorState({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const clientDashboardCopy = useClientDashboardCopy();
  const mapped = mapApiError(error);
  const description =
    mapped.description === 'The request could not be completed.'
      ? clientDashboardCopy.error.network
      : mapped.description;

  return (
    <PageContainer density="client" className="mx-auto max-w-5xl xl:max-w-6xl">
      <section
        className="client-surface-card py-8 text-center"
        aria-labelledby="dashboard-error-title"
      >
        <h1
          id="dashboard-error-title"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {mapped.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <Button
          className="mt-6 min-h-12 min-w-44"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying
            ? clientDashboardCopy.error.retrying
            : clientDashboardCopy.error.retry}
        </Button>
      </section>
    </PageContainer>
  );
}
