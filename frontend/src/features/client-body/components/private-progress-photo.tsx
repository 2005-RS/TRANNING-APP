import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { clientBodyCopy } from '@/features/client-body/copy';
import { useProgressPhotoAccess } from '@/features/client-body/hooks/use-progress-photo-access';
import { mapApiError } from '@/shared/errors/api-error';

function useNearViewport() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setEnabled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, enabled };
}

export function PrivateProgressPhoto({
  photoId,
  label,
}: {
  photoId: string;
  label: string;
}) {
  const { ref, enabled } = useNearViewport();
  const access = useProgressPhotoAccess(photoId, enabled);
  const url = access.data?.url;
  const mapped = access.isError ? mapApiError(access.error as unknown) : null;

  let content: ReactNode;

  if (!enabled || access.isPending) {
    content = (
      <div
        role="status"
        aria-label={clientBodyCopy.image.loading}
        className="aspect-[3/4] overflow-hidden rounded-xl bg-muted"
      >
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  } else if (access.isError || !url) {
    content = (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl bg-muted px-3 text-center">
        <p className="text-sm text-muted-foreground">
          {mapped?.description ?? clientBodyCopy.image.failed}
        </p>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={access.isFetching}
          onClick={() => {
            void access.refetch();
          }}
        >
          {access.isFetching ? clientBodyCopy.image.retrying : clientBodyCopy.image.retry}
        </Button>
      </div>
    );
  } else {
    content = (
      <img
        src={url}
        alt={label}
        loading="lazy"
        decoding="async"
        className="aspect-[3/4] w-full rounded-xl object-cover"
        onError={() => {
          void access.refetch();
        }}
      />
    );
  }

  return <div ref={ref}>{content}</div>;
}
