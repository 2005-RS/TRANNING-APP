import { useQueryClient } from '@tanstack/react-query';
import {
  useClientCheckInsCreate,
  useClientCheckInsGetOne,
  useClientCheckInsList,
  useClientCheckInsRemove,
  useClientCheckInsUpdate,
  useClientCheckInsUpdateStatus,
} from '@/generated/client-check-ins/client-check-ins';
import { invalidateClientCheckInQueries } from '@/features/client-check-ins/lib/invalidate';
import {
  CLIENT_CHECK_INS_PAGE_SIZE,
  CLIENT_CHECK_INS_STALE_TIME_MS,
} from '@/features/client-check-ins/lib/query-policy';

const queryPolicy = {
  staleTime: CLIENT_CHECK_INS_STALE_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export function useClientCheckInList(page: number) {
  return useClientCheckInsList(
    {
      page,
      limit: CLIENT_CHECK_INS_PAGE_SIZE,
    },
    { query: queryPolicy },
  );
}

export function useClientCheckInDetail(checkInId: string) {
  return useClientCheckInsGetOne(checkInId, { query: queryPolicy });
}

export function useClientCheckInMutations() {
  const queryClient = useQueryClient();

  const create = useClientCheckInsCreate({
    mutation: {
      onSuccess: (data) => invalidateClientCheckInQueries(queryClient, data.id),
    },
  });
  const update = useClientCheckInsUpdate({
    mutation: {
      onSuccess: (data) => invalidateClientCheckInQueries(queryClient, data.id),
    },
  });
  const updateStatus = useClientCheckInsUpdateStatus({
    mutation: {
      onSuccess: (data) => invalidateClientCheckInQueries(queryClient, data.id),
    },
  });
  const remove = useClientCheckInsRemove({
    mutation: {
      onSuccess: (_data, variables) =>
        invalidateClientCheckInQueries(queryClient, variables.checkInId),
    },
  });

  return { create, update, updateStatus, remove };
}
