import { useEffect } from 'react';
import { useProgressPhotosCreateAccess } from '@/generated/progress-photos/progress-photos';
import {
  TRAINER_SIGNED_ACCESS_GC_TIME_MS,
  TRAINER_SIGNED_ACCESS_STALE_TIME_MS,
} from '@/features/trainer-workspace/lib/query-policy';

export function useTrainerProgressPhotoAccess(
  clientId: string,
  photoId: string,
  enabled: boolean,
) {
  const query = useProgressPhotosCreateAccess(clientId, photoId, {
    query: {
      enabled: enabled && clientId.length > 0 && photoId.length > 0,
      staleTime: TRAINER_SIGNED_ACCESS_STALE_TIME_MS,
      gcTime: TRAINER_SIGNED_ACCESS_GC_TIME_MS,
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
