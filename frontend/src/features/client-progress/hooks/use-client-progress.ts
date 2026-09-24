import { useClientBodyMeasurementsList } from '@/generated/client-body-measurements/client-body-measurements';
import {
  useClientProgressGetSummary,
  useClientProgressListExercises,
} from '@/generated/client-progress/client-progress';
import {
  ClientProgressListExercisesDirection,
  ClientProgressListExercisesSort,
} from '@/generated/models';
import {
  CLIENT_PROGRESS_BODY_LIST_LIMIT,
  CLIENT_PROGRESS_EXERCISE_LIST_LIMIT,
  CLIENT_PROGRESS_STALE_TIME_MS,
} from '@/features/client-progress/lib/query-policy';
import {
  previousWindow,
  windowForPeriod,
  type ProgressPeriod,
} from '@/features/client-progress/lib/period';

const queryPolicy = {
  staleTime: CLIENT_PROGRESS_STALE_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export function useProgressWindows(period: ProgressPeriod) {
  const current = windowForPeriod(period);
  return {
    current,
    previous: previousWindow(current),
  };
}

export function useProgressSummary(period: ProgressPeriod) {
  const { current } = useProgressWindows(period);
  return useClientProgressGetSummary(current, {
    query: queryPolicy,
  });
}

export function usePreviousProgressSummary(period: ProgressPeriod) {
  const { previous } = useProgressWindows(period);
  return useClientProgressGetSummary(previous, {
    query: queryPolicy,
  });
}

export function useProgressExercises(period: ProgressPeriod) {
  const { current } = useProgressWindows(period);
  return useClientProgressListExercises(
    {
      ...current,
      page: 1,
      limit: CLIENT_PROGRESS_EXERCISE_LIST_LIMIT,
      sort: ClientProgressListExercisesSort.lastPerformedAt,
      direction: ClientProgressListExercisesDirection.DESC,
    },
    {
      query: queryPolicy,
    },
  );
}

export function useProgressBodyMeasurements(period: ProgressPeriod) {
  const { current } = useProgressWindows(period);
  return useClientBodyMeasurementsList(
    {
      ...current,
      page: 1,
      limit: CLIENT_PROGRESS_BODY_LIST_LIMIT,
    },
    {
      query: queryPolicy,
    },
  );
}
