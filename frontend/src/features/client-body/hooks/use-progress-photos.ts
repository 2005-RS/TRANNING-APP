import { useQueryClient } from '@tanstack/react-query';
import {
  useClientProgressPhotosCreateUploadRequest,
  useClientProgressPhotosFinalize,
  useClientProgressPhotosList,
  useClientProgressPhotosRemove,
} from '@/generated/client-progress-photos/client-progress-photos';
import {
  ClientProgressPhotosListStatus,
} from '@/generated/models';
import {
  CLIENT_BODY_PHOTO_PAGE_SIZE,
  CLIENT_BODY_STALE_TIME_MS,
} from '@/features/client-body/lib/query-policy';
import { invalidateProgressPhotoQueries } from '@/features/client-body/lib/invalidate';

const queryPolicy = {
  staleTime: CLIENT_BODY_STALE_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export function useReadyProgressPhotos(page: number) {
  return useClientProgressPhotosList(
    {
      page,
      limit: CLIENT_BODY_PHOTO_PAGE_SIZE,
      status: ClientProgressPhotosListStatus.READY,
    },
    { query: queryPolicy },
  );
}

export function usePendingProgressPhotos() {
  return useClientProgressPhotosList(
    {
      page: 1,
      limit: CLIENT_BODY_PHOTO_PAGE_SIZE,
      status: ClientProgressPhotosListStatus.PENDING_UPLOAD,
    },
    { query: queryPolicy },
  );
}

export function useFailedProgressPhotos() {
  return useClientProgressPhotosList(
    {
      page: 1,
      limit: CLIENT_BODY_PHOTO_PAGE_SIZE,
      status: ClientProgressPhotosListStatus.FAILED,
    },
    { query: queryPolicy },
  );
}

export function useProgressPhotoMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => invalidateProgressPhotoQueries(queryClient);
  const createUpload = useClientProgressPhotosCreateUploadRequest();
  const finalize = useClientProgressPhotosFinalize({
    mutation: { onSuccess: invalidate },
  });
  const remove = useClientProgressPhotosRemove({
    mutation: { onSuccess: invalidate },
  });
  return { createUpload, finalize, remove };
}
