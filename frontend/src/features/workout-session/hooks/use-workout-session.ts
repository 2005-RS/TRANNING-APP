import { useQueryClient } from '@tanstack/react-query';
import { CLIENT_DASHBOARD_PERIOD_DAYS } from '@/features/client-dashboard/lib/query-policy';
import { getClientDashboardGetMineQueryKey } from '@/generated/client-dashboard/client-dashboard';
import {
  getClientWorkoutSessionsGetCurrentQueryKey,
  getClientWorkoutSessionsGetMineByIdQueryKey,
  useClientWorkoutSessionsGetCurrent,
  useClientWorkoutSessionsGetMineById,
  useClientWorkoutSessionsReplaceSets,
  useClientWorkoutSessionsStart,
  useClientWorkoutSessionsUpdateStatus,
} from '@/generated/client-workout-sessions/client-workout-sessions';
import { useClientTrainingPlansGetCurrent } from '@/generated/client-training-plans/client-training-plans';
import { ApiError } from '@/shared/errors/api-error';
import {
  CURRENT_TRAINING_PLAN_STALE_TIME_MS,
  CURRENT_WORKOUT_SESSION_STALE_TIME_MS,
  WORKOUT_SESSION_DETAIL_STALE_TIME_MS,
} from '@/features/workout-session/lib/query-policy';
import { isUuid } from '@/features/workout-session/lib/session-ids';
import type { WorkoutSessionResponseDto } from '@/generated/models';
import { WorkoutSessionResponseDtoStatus } from '@/generated/models';

function shouldRetrySessionQuery(failureCount: number, error: unknown): boolean {
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

export function useCurrentWorkoutSession() {
  return useClientWorkoutSessionsGetCurrent({
    query: {
      staleTime: CURRENT_WORKOUT_SESSION_STALE_TIME_MS,
      refetchOnWindowFocus: true,
    },
  });
}

export function useCurrentTrainingPlan() {
  return useClientTrainingPlansGetCurrent({
    query: {
      staleTime: CURRENT_TRAINING_PLAN_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });
}

export function useWorkoutSessionById(sessionId: string | undefined) {
  const validId = isUuid(sessionId) ? sessionId : '';
  return useClientWorkoutSessionsGetMineById(validId, {
    query: {
      enabled: isUuid(sessionId),
      staleTime: WORKOUT_SESSION_DETAIL_STALE_TIME_MS,
      retry: shouldRetrySessionQuery,
    },
  });
}

export function useWorkoutSessionMutations() {
  const queryClient = useQueryClient();

  function syncSessionCache(session: WorkoutSessionResponseDto) {
    queryClient.setQueryData(
      getClientWorkoutSessionsGetMineByIdQueryKey(session.id),
      session,
    );

    if (session.status === WorkoutSessionResponseDtoStatus.IN_PROGRESS) {
      queryClient.setQueryData(getClientWorkoutSessionsGetCurrentQueryKey(), {
        workoutSession: session,
      });
    } else {
      queryClient.setQueryData(getClientWorkoutSessionsGetCurrentQueryKey(), {
        workoutSession: null,
      });
    }

    void queryClient.invalidateQueries({
      queryKey: getClientDashboardGetMineQueryKey({
        periodDays: CLIENT_DASHBOARD_PERIOD_DAYS,
      }),
    });
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/v1/clients/me/progress');
      },
    });
  }

  const start = useClientWorkoutSessionsStart({
    mutation: {
      onSuccess: syncSessionCache,
    },
  });

  const replaceSets = useClientWorkoutSessionsReplaceSets({
    mutation: {
      onSuccess: syncSessionCache,
    },
  });

  const updateStatus = useClientWorkoutSessionsUpdateStatus({
    mutation: {
      onSuccess: syncSessionCache,
    },
  });

  return { start, replaceSets, updateStatus };
}
