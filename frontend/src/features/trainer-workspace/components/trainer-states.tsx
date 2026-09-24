import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { mapApiError } from '@/shared/errors/api-error';

export function TrainerErrorState({
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
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const mapped = mapApiError(error);
  return (
    <WorkspaceSurface className="py-8 text-center" aria-labelledby="trainer-error-title">
      <h2 id="trainer-error-title" className="text-lg font-semibold tracking-tight text-foreground">
        {title ?? mapped.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {mapped.description}
      </p>
      <Button className="mt-6 min-h-10 min-w-36" disabled={retrying} onClick={onRetry}>
        {retrying ? trainerWorkspaceCopy.retrying : trainerWorkspaceCopy.retry}
      </Button>
    </WorkspaceSurface>
  );
}

export function TrainerPageError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <PageContainer>
      <TrainerErrorState error={error} onRetry={onRetry} retrying={retrying} />
    </PageContainer>
  );
}

export function TrainerEmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <WorkspaceSurface className="py-8" aria-labelledby="trainer-empty-title">
      <h2 id="trainer-empty-title" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
      {actions ? <div className="mt-6">{actions}</div> : null}
    </WorkspaceSurface>
  );
}
