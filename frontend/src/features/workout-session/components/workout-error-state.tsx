import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { workoutCopy } from '@/features/workout-session/copy';
import { mapApiError } from '@/shared/errors/api-error';

export function WorkoutErrorState({
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
      ? workoutCopy.error.network
      : mapped.description;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <section className="client-surface-card py-8 text-center" aria-labelledby="workout-error-title">
        <h1
          id="workout-error-title"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {mapped.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button className="min-h-12 min-w-44" disabled={retrying} onClick={onRetry}>
            {retrying ? workoutCopy.error.retrying : workoutCopy.error.retry}
          </Button>
          <Link
            to="/client/training"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {workoutCopy.focus.backToTraining}
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
