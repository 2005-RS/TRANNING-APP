import { useEffect } from 'react';
import { useClientProgressPhotosCreateAccess } from '@/generated/client-progress-photos/client-progress-photos';
import { CLIENT_BODY_PHOTO_ACCESS_GC_TIME_MS } from '@/features/client-body/lib/query-policy';

export function useProgressPhotoAccess(photoId: string, enabled: boolean) {
  const query = useClientProgressPhotosCreateAccess(photoId, {
    query: {
      enabled: enabled && photoId.length > 0,
      staleTime: 15_000,
      gcTime: CLIENT_BODY_PHOTO_ACCESS_GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  const { data, refetch, isFetching } = query;

  useEffect(() => {
    const expiresAt = data?.expiresAt;
    if (!expiresAt || !enabled) {
      return;
    }
    const refreshIn = new Date(expiresAt).getTime() - Date.now() - 5_000;
    if (!Number.isFinite(refreshIn)) {
      return;
    }
    if (refreshIn <= 0) {
      if (!isFetching) {
        void refetch();
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void refetch();
    }, refreshIn);
    return () => window.clearTimeout(timer);
  }, [data?.expiresAt, enabled, isFetching, refetch]);

  return query;
}
