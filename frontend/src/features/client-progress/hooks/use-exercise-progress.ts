import { useClientProgressGetExercise } from '@/generated/client-progress/client-progress';
import { ApiError } from '@/shared/errors/api-error';
import { isUuid } from '@/features/workout-session/lib/session-ids';
import {
  CLIENT_PROGRESS_EXERCISE_HISTORY_LIMIT,
  CLIENT_PROGRESS_STALE_TIME_MS,
} from '@/features/client-progress/lib/query-policy';
import { windowForPeriod, type ProgressPeriod } from '@/features/client-progress/lib/period';

function shouldRetryExerciseQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 404 ||
      error.statusCode === 429
    ) {
      return false;
    }
  }
  return failureCount < 1;
}

export function useExerciseProgress(exerciseId: string | undefined, period: ProgressPeriod) {
  const window = windowForPeriod(period);
  const validId = isUuid(exerciseId) ? exerciseId : '';
  return useClientProgressGetExercise(validId, {
    ...window,
    page: 1,
    limit: CLIENT_PROGRESS_EXERCISE_HISTORY_LIMIT,
  }, {
    query: {
      enabled: isUuid(exerciseId),
      staleTime: CLIENT_PROGRESS_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: shouldRetryExerciseQuery,
    },
  });
}
