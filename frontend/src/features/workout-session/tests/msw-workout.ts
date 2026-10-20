import { delay, http, HttpResponse } from 'msw';
import type {
  CreateSelfTrainingPlanDto,
  ReplaceWorkoutSetsDto,
  StartWorkoutSessionDto,
  UpdateWorkoutSessionStatusDto,
  WorkoutLibraryItemResponseDto,
  WorkoutSessionResponseDto,
  WorkoutSessionSummaryResponseDto,
} from '@/generated/models';
import {
  WorkoutLibraryExerciseResponseDtoPrescriptionType,
  WorkoutSessionResponseDtoStatus,
  WorkoutSessionSummaryResponseDtoStatus,
} from '@/generated/models';
import {
  applySets,
  createInProgressSession,
  currentTrainingPlan,
  FOREIGN_SESSION_ID,
  SESSION_ID,
  sessionFromPlanWorkout,
} from '@/features/workout-session/tests/fixtures';

const API = 'http://localhost:3000/api/v1/clients/me';

const workoutLibrary: WorkoutLibraryItemResponseDto[] = [
  {
    id: '90000000-aaaa-4111-8111-900000000001',
    name: 'Full body foundation',
    description: 'A balanced full-body routine.',
    exerciseCount: 2,
    estimatedMinutes: 45,
    exercises: [
      {
        exerciseId: '77777777-dddd-4ddd-8ddd-777777777777',
        name: 'Back squat',
        sets: 3,
        prescriptionType: WorkoutLibraryExerciseResponseDtoPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        durationSeconds: null,
        restSeconds: 90,
      },
    ],
  },
  {
    id: '90000000-aaaa-4111-8111-900000000002',
    name: 'Upper body foundation',
    description: 'A balanced upper-body routine.',
    exerciseCount: 1,
    estimatedMinutes: 30,
    exercises: [
      {
        exerciseId: '88888888-dddd-4ddd-8ddd-888888888888',
        name: 'Bench press',
        sets: 3,
        prescriptionType: WorkoutLibraryExerciseResponseDtoPrescriptionType.REPS,
        repsMin: 8,
        repsMax: 10,
        durationSeconds: null,
        restSeconds: 90,
      },
    ],
  },
];

const completedSessions: WorkoutSessionSummaryResponseDto[] = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    trainingPlanId: currentTrainingPlan.id,
    sourceTrainingPlanWorkoutId: currentTrainingPlan.workouts[0]?.id ?? '',
    workoutName: 'Lower A',
    workoutDescription: null,
    scheduledDay: null,
    status: WorkoutSessionSummaryResponseDtoStatus.COMPLETED,
    startedAt: '2026-09-03T10:00:00.000Z',
    completedAt: '2026-09-03T10:45:00.000Z',
    cancelledAt: null,
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:45:00.000Z',
  },
];

type WorkoutMockState = {
  currentSession: WorkoutSessionResponseDto | null;
  sessions: Record<string, WorkoutSessionResponseDto>;
  plan: typeof currentTrainingPlan | null;
  delayMs: number;
  startStatus: number;
  createSelfPlanStatus: number;
  sessionStatus: number;
  failNetwork: boolean;
  library: WorkoutLibraryItemResponseDto[];
  completedSessions: WorkoutSessionSummaryResponseDto[];
  /** Archived plans for the Historial tab (empty by default). */
  archivedPlans: Array<typeof currentTrainingPlan>;
  lastCreateSelfPlan: CreateSelfTrainingPlanDto | null;
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
  createSelfPlanStatus: 201,
  sessionStatus: 200,
  failNetwork: false,
  library: structuredClone(workoutLibrary),
  completedSessions: structuredClone(completedSessions),
  archivedPlans: [],
  lastCreateSelfPlan: null,
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
  workoutMockState.createSelfPlanStatus = 201;
  workoutMockState.sessionStatus = 200;
  workoutMockState.failNetwork = false;
  workoutMockState.library = structuredClone(workoutLibrary);
  workoutMockState.completedSessions = structuredClone(completedSessions);
  workoutMockState.archivedPlans = [];
  workoutMockState.lastCreateSelfPlan = null;
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
  http.get(`${API}/workout-library`, () => HttpResponse.json(workoutMockState.library)),
  http.post(`${API}/training-plans/self`, async ({ request }) => {
    if (workoutMockState.createSelfPlanStatus === 409) {
      return HttpResponse.json(
        errorBody(
          409,
          '/api/v1/clients/me/training-plans/self',
          'Your trainer manages your active plan.',
          'CONFLICT',
        ),
        { status: 409 },
      );
    }
    workoutMockState.lastCreateSelfPlan = await request.json() as CreateSelfTrainingPlanDto;
    return HttpResponse.json({ ...currentTrainingPlan, isSelfAuthored: true }, { status: 201 });
  }),
  http.get(`${API}/training-plans`, () =>
    HttpResponse.json({
      data: workoutMockState.archivedPlans,
      meta: {
        page: 1,
        limit: 20,
        totalItems: workoutMockState.archivedPlans.length,
        totalPages: workoutMockState.archivedPlans.length ? 1 : 0,
      },
    }),
  ),
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
  http.get(`${API}/training-plans/:planId`, ({ params }) => {
    const plan = workoutMockState.archivedPlans.find((item) => item.id === params.planId);
    return plan
      ? HttpResponse.json(plan)
      : HttpResponse.json(
          errorBody(404, `/training-plans/${String(params.planId)}`, 'Not found', 'NOT_FOUND'),
          { status: 404 },
        );
  }),
  http.get(`${API}/workout-sessions`, () =>
    HttpResponse.json({
      data: workoutMockState.completedSessions,
      meta: { page: 1, limit: 10, totalItems: workoutMockState.completedSessions.length, totalPages: 1 },
    }),
  ),
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
