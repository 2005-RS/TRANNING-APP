import { useEffect, useRef, useState } from 'react';
import { useTrainerProgressPhotoAccess } from '@/features/trainer-workspace/hooks/use-trainer-progress-photo-access';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { mapApiError } from '@/shared/errors/api-error';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

export function TrainerPrivatePhoto({
  clientId,
  photoId,
  label,
}: {
  clientId: string;
  photoId: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  const access = useTrainerProgressPhotoAccess(clientId, photoId, near);
  const url = access.data?.url;
  const mapped = access.isError ? mapApiError(access.error) : null;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {!near || access.isPending ? (
        <div role="status" aria-label={trainerWorkspaceCopy.body.imageLoading}>
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        </div>
      ) : access.isError || !url ? (
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-lg bg-muted px-3 text-center">
          <p className="text-sm text-muted-foreground">
            {mapped?.description ?? trainerWorkspaceCopy.body.imageFailed}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={access.isFetching}
            onClick={() => {
              void access.refetch();
            }}
          >
            {trainerWorkspaceCopy.body.imageRetry}
          </Button>
        </div>
      ) : (
        <img
          src={url}
          alt={label}
          loading="lazy"
          decoding="async"
          className="aspect-[3/4] w-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}
