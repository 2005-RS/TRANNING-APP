import { delay, http, HttpResponse } from 'msw';
import type {
  ReplaceWorkoutSetsDto,
  StartWorkoutSessionDto,
  UpdateWorkoutSessionStatusDto,
  WorkoutSessionResponseDto,
} from '@/generated/models';
import { WorkoutSessionResponseDtoStatus } from '@/generated/models';
import {
  applySets,
  createInProgressSession,
  currentTrainingPlan,
  FOREIGN_SESSION_ID,
  SESSION_ID,
  sessionFromPlanWorkout,
} from '@/features/workout-session/tests/fixtures';

const API = 'http://localhost:3000/api/v1/clients/me';

type WorkoutMockState = {
  currentSession: WorkoutSessionResponseDto | null;
  sessions: Record<string, WorkoutSessionResponseDto>;
  plan: typeof currentTrainingPlan | null;
  delayMs: number;
  startStatus: number;
  sessionStatus: number;
  failNetwork: boolean;
  lastReplaceSets: {
    sessionId: string;
    sessionExerciseId: string;
    sets: ReplaceWorkoutSetsDto['sets'];
  } | null;
};

export const workoutMockState: WorkoutMockState = {
  currentSession: null,
  sessions: {
    [SESSION_ID]: createInProgressSession(),
  },
  plan: currentTrainingPlan,
  delayMs: 0,
  startStatus: 201,
  sessionStatus: 200,
  failNetwork: false,
  lastReplaceSets: null,
};

export function resetWorkoutMockState(): void {
  workoutMockState.currentSession = null;
  workoutMockState.sessions = {
    [SESSION_ID]: createInProgressSession(),
  };
  workoutMockState.plan = currentTrainingPlan;
  workoutMockState.delayMs = 0;
  workoutMockState.startStatus = 201;
  workoutMockState.sessionStatus = 200;
  workoutMockState.failNetwork = false;
  workoutMockState.lastReplaceSets = null;
}

function errorBody(status: number, path: string, message: string, code: string) {
  return {
    statusCode: status,
    code,
    message,
    path,
    timestamp: '2026-09-04T00:00:00.000Z',
    requestId: 'req-workout',
  };
}

async function maybeDelay() {
  if (workoutMockState.delayMs > 0) {
    await delay(workoutMockState.delayMs);
  }
}

export const workoutHandlers = [
  http.get(`${API}/training-plans/current`, async () => {
    await maybeDelay();
    if (workoutMockState.failNetwork) {
      return HttpResponse.error();
    }
    return HttpResponse.json({ trainingPlan: workoutMockState.plan });
  }),
  http.get(`${API}/workout-sessions/current`, async () => {
    await maybeDelay();
    if (workoutMockState.failNetwork) {
      return HttpResponse.error();
    }
    return HttpResponse.json({
      workoutSession: workoutMockState.currentSession,
    });
  }),
  http.post(`${API}/workout-sessions`, async ({ request }) => {
    await maybeDelay();
    if (workoutMockState.startStatus === 409) {
      return HttpResponse.json(
        errorBody(
          409,
          '/api/v1/clients/me/workout-sessions',
          'An in-progress workout session already exists.',
          'CONFLICT',
        ),
        { status: 409 },
      );
    }
    const body = (await request.json()) as StartWorkoutSessionDto;
    const created = sessionFromPlanWorkout(body.trainingPlanWorkoutId);
    if (!created) {
      return HttpResponse.json(
        errorBody(
          404,
          '/api/v1/clients/me/workout-sessions',
          'This resource is not available.',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }
    workoutMockState.currentSession = created;
    workoutMockState.sessions[created.id] = created;
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put(
    `${API}/workout-sessions/:sessionId/exercises/:sessionExerciseId/sets`,
    async ({ params, request }) => {
      const sessionId = String(params.sessionId);
      const sessionExerciseId = String(params.sessionExerciseId);
      const existing = workoutMockState.sessions[sessionId];
      if (!existing || existing.status !== WorkoutSessionResponseDtoStatus.IN_PROGRESS) {
        return HttpResponse.json(
          errorBody(
            404,
            `/api/v1/clients/me/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/sets`,
            'This resource is not available.',
            'NOT_FOUND',
          ),
          { status: 404 },
        );
      }
      const body = (await request.json()) as ReplaceWorkoutSetsDto;
      workoutMockState.lastReplaceSets = {
        sessionId,
        sessionExerciseId,
        sets: body.sets,
      };
      const updated = applySets(existing, sessionExerciseId, body.sets);
      workoutMockState.sessions[sessionId] = updated;
      if (workoutMockState.currentSession?.id === sessionId) {
        workoutMockState.currentSession = updated;
      }
      return HttpResponse.json(updated);
    },
  ),
  http.patch(`${API}/workout-sessions/:sessionId/status`, async ({ params, request }) => {
    const sessionId = String(params.sessionId);
    const existing = workoutMockState.sessions[sessionId];
    if (!existing) {
      return HttpResponse.json(
        errorBody(
          404,
          `/api/v1/clients/me/workout-sessions/${sessionId}/status`,
          'This resource is not available.',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }
    const body = (await request.json()) as UpdateWorkoutSessionStatusDto;
    const updated: WorkoutSessionResponseDto = {
      ...existing,
      status: body.status,
      completedAt:
        body.status === 'COMPLETED' ? '2026-09-04T15:00:00.000Z' : existing.completedAt,
      cancelledAt:
        body.status === 'CANCELLED' ? '2026-09-04T15:00:00.000Z' : existing.cancelledAt,
      updatedAt: '2026-09-04T15:00:00.000Z',
    };
    workoutMockState.sessions[sessionId] = updated;
    if (workoutMockState.currentSession?.id === sessionId) {
      workoutMockState.currentSession = null;
    }
    return HttpResponse.json(updated);
  }),
  http.get(`${API}/workout-sessions/:sessionId`, async ({ params }) => {
    await maybeDelay();
    if (workoutMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (workoutMockState.sessionStatus >= 400) {
      return HttpResponse.json(
        errorBody(
          workoutMockState.sessionStatus,
          `/api/v1/clients/me/workout-sessions/${String(params.sessionId)}`,
          workoutMockState.sessionStatus === 403
            ? 'Forbidden internals must not leak'
            : 'This resource is not available.',
          workoutMockState.sessionStatus === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
        ),
        { status: workoutMockState.sessionStatus },
      );
    }
    const sessionId = String(params.sessionId);
    if (sessionId === FOREIGN_SESSION_ID) {
      return HttpResponse.json(
        errorBody(
          404,
          `/api/v1/clients/me/workout-sessions/${sessionId}`,
          'This resource is not available.',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }
    const session = workoutMockState.sessions[sessionId];
    if (!session) {
      return HttpResponse.json(
        errorBody(
          404,
          `/api/v1/clients/me/workout-sessions/${sessionId}`,
          'This resource is not available.',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }
    return HttpResponse.json(session);
  }),
];
