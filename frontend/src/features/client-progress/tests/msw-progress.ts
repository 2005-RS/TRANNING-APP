import { delay, http, HttpResponse } from 'msw';
import { utcDateKey } from '@/features/client-progress/lib/period';
import {
  emptyBodyList,
  emptyExerciseList,
  emptyProgressSummary,
  MISSING_EXERCISE_ID,
  populatedExerciseDetail,
} from '@/features/client-progress/tests/fixtures';
import type {
  ExerciseProgressDetailResponseDto,
  PaginatedBodyMeasurementsResponseDto,
  PaginatedExerciseProgressResponseDto,
  ProgressSummaryResponseDto,
} from '@/generated/models';

const API = 'http://localhost:3000/api/v1/clients/me';

type ProgressMockState = {
  summary: ProgressSummaryResponseDto;
  previousSummary: ProgressSummaryResponseDto;
  exercises: PaginatedExerciseProgressResponseDto;
  body: PaginatedBodyMeasurementsResponseDto;
  exerciseDetail: ExerciseProgressDetailResponseDto | null;
  summaryStatus: number;
  previousStatus: number;
  exercisesStatus: number;
  bodyStatus: number;
  detailStatus: number;
  delayMs: number;
  failNetwork: boolean;
  lastSummaryDateFrom: string | null;
  lastSummaryDateTo: string | null;
  lastCurrentSummaryDateFrom: string | null;
  lastCurrentSummaryDateTo: string | null;
};

export const progressMockState: ProgressMockState = {
  summary: emptyProgressSummary,
  previousSummary: emptyProgressSummary,
  exercises: emptyExerciseList,
  body: emptyBodyList,
  exerciseDetail: populatedExerciseDetail,
  summaryStatus: 200,
  previousStatus: 200,
  exercisesStatus: 200,
  bodyStatus: 200,
  detailStatus: 200,
  delayMs: 0,
  failNetwork: false,
  lastSummaryDateFrom: null,
  lastSummaryDateTo: null,
  lastCurrentSummaryDateFrom: null,
  lastCurrentSummaryDateTo: null,
};

export function resetProgressMockState(): void {
  progressMockState.summary = emptyProgressSummary;
  progressMockState.previousSummary = emptyProgressSummary;
  progressMockState.exercises = emptyExerciseList;
  progressMockState.body = emptyBodyList;
  progressMockState.exerciseDetail = populatedExerciseDetail;
  progressMockState.summaryStatus = 200;
  progressMockState.previousStatus = 200;
  progressMockState.exercisesStatus = 200;
  progressMockState.bodyStatus = 200;
  progressMockState.detailStatus = 200;
  progressMockState.delayMs = 0;
  progressMockState.failNetwork = false;
  progressMockState.lastSummaryDateFrom = null;
  progressMockState.lastSummaryDateTo = null;
  progressMockState.lastCurrentSummaryDateFrom = null;
  progressMockState.lastCurrentSummaryDateTo = null;
}

function errorBody(status: number, path: string, message: string) {
  return {
    statusCode: status,
    code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
    message,
    path,
    timestamp: '2026-09-04T00:00:00.000Z',
    requestId: 'req-progress',
  };
}

function isCurrentWindow(url: URL): boolean {
  const dateTo = url.searchParams.get('dateTo');
  return dateTo === utcDateKey(new Date());
}

export const progressHandlers = [
  http.get(`${API}/progress/summary`, async ({ request }) => {
    const url = new URL(request.url);
    progressMockState.lastSummaryDateFrom = url.searchParams.get('dateFrom');
    progressMockState.lastSummaryDateTo = url.searchParams.get('dateTo');
    const current = isCurrentWindow(url);
    if (current) {
      progressMockState.lastCurrentSummaryDateFrom = url.searchParams.get('dateFrom');
      progressMockState.lastCurrentSummaryDateTo = url.searchParams.get('dateTo');
    }

    if (progressMockState.delayMs > 0 && current) {
      await delay(progressMockState.delayMs);
    }
    if (progressMockState.failNetwork && current) {
      return HttpResponse.error();
    }

    const status = current
      ? progressMockState.summaryStatus
      : progressMockState.previousStatus;
    if (status >= 400) {
      return HttpResponse.json(
        errorBody(status, '/api/v1/clients/me/progress/summary', 'Progress summary failed'),
        { status },
      );
    }

    return HttpResponse.json(
      current ? progressMockState.summary : progressMockState.previousSummary,
    );
  }),

  http.get(`${API}/progress/exercises/:exerciseId`, async ({ params }) => {
    if (progressMockState.delayMs > 0) {
      await delay(progressMockState.delayMs);
    }
    if (progressMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (params.exerciseId === MISSING_EXERCISE_ID || progressMockState.detailStatus >= 400) {
      const status =
        params.exerciseId === MISSING_EXERCISE_ID ? 404 : progressMockState.detailStatus;
      return HttpResponse.json(
        errorBody(
          status,
          `/api/v1/clients/me/progress/exercises/${params.exerciseId}`,
          status === 403 ? 'Forbidden internals must not leak' : 'Exercise progress not found',
        ),
        { status },
      );
    }
    return HttpResponse.json(progressMockState.exerciseDetail);
  }),

  http.get(`${API}/progress/exercises`, async () => {
    if (progressMockState.delayMs > 0) {
      await delay(progressMockState.delayMs);
    }
    if (progressMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (progressMockState.exercisesStatus >= 400) {
      return HttpResponse.json(
        errorBody(
          progressMockState.exercisesStatus,
          '/api/v1/clients/me/progress/exercises',
          'Exercise list failed',
        ),
        { status: progressMockState.exercisesStatus },
      );
    }
    return HttpResponse.json(progressMockState.exercises);
  }),

  http.get(`${API}/body-measurements`, async () => {
    if (progressMockState.delayMs > 0) {
      await delay(progressMockState.delayMs);
    }
    if (progressMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (progressMockState.bodyStatus >= 400) {
      return HttpResponse.json(
        errorBody(
          progressMockState.bodyStatus,
          '/api/v1/clients/me/body-measurements',
          'Body measurements failed',
        ),
        { status: progressMockState.bodyStatus },
      );
    }
    return HttpResponse.json(progressMockState.body);
  }),
];
