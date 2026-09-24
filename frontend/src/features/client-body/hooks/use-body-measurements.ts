import { useQueryClient } from '@tanstack/react-query';
import {
  useClientBodyMeasurementsCreate,
  useClientBodyMeasurementsList,
  useClientBodyMeasurementsUpdate,
} from '@/generated/client-body-measurements/client-body-measurements';
import {
  CLIENT_BODY_MEASUREMENT_PAGE_SIZE,
  CLIENT_BODY_STALE_TIME_MS,
} from '@/features/client-body/lib/query-policy';
import { invalidateBodyMeasurementQueries } from '@/features/client-body/lib/invalidate';

const queryPolicy = {
  staleTime: CLIENT_BODY_STALE_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export function useBodyMeasurementList(page: number) {
  return useClientBodyMeasurementsList(
    {
      page,
      limit: CLIENT_BODY_MEASUREMENT_PAGE_SIZE,
    },
    { query: queryPolicy },
  );
}

export function useBodyMeasurementMutations() {
  const queryClient = useQueryClient();
  const create = useClientBodyMeasurementsCreate({
    mutation: {
      onSuccess: () => invalidateBodyMeasurementQueries(queryClient),
    },
  });
  const update = useClientBodyMeasurementsUpdate({
    mutation: {
      onSuccess: () => invalidateBodyMeasurementQueries(queryClient),
    },
  });
  return { create, update };
}
