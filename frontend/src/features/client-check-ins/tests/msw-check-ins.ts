import { delay, http, HttpResponse } from 'msw';
import {
  CheckInResponseDtoStatus,
  type CheckInResponseDto,
  type CreateCheckInDto,
  type UpdateCheckInDto,
  type UpdateCheckInStatusDto,
} from '@/generated/models';
import {
  CREATED_CHECK_IN_ID,
  emptyCheckInList,
  paginateCheckIns,
  populatedCheckIns,
} from '@/features/client-check-ins/tests/fixtures';

const API = 'http://localhost:3000/api/v1/clients/me/check-ins';

type CheckInMockState = {
  items: CheckInResponseDto[];
  delayMs: number;
  failNetwork: boolean;
  listStatus: number;
  detailStatus: number;
  createStatus: number;
  updateStatus: number;
  submitStatus: number;
  lastCreatePayload: CreateCheckInDto | null;
  lastUpdatePayload: UpdateCheckInDto | null;
  lastStatusPayload: UpdateCheckInStatusDto | null;
  submitCount: number;
};

export const checkInMockState: CheckInMockState = {
  items: [],
  delayMs: 0,
  failNetwork: false,
  listStatus: 200,
  detailStatus: 200,
  createStatus: 201,
  updateStatus: 200,
  submitStatus: 200,
  lastCreatePayload: null,
  lastUpdatePayload: null,
  lastStatusPayload: null,
  submitCount: 0,
};

export function resetCheckInMockState(): void {
  checkInMockState.items = [];
  checkInMockState.delayMs = 0;
  checkInMockState.failNetwork = false;
  checkInMockState.listStatus = 200;
  checkInMockState.detailStatus = 200;
  checkInMockState.createStatus = 201;
  checkInMockState.updateStatus = 200;
  checkInMockState.submitStatus = 200;
  checkInMockState.lastCreatePayload = null;
  checkInMockState.lastUpdatePayload = null;
  checkInMockState.lastStatusPayload = null;
  checkInMockState.submitCount = 0;
}

export function setCheckInList(items: CheckInResponseDto[]): void {
  checkInMockState.items = items.map((item) => ({
    ...item,
    responses: { ...item.responses },
    review: item.review ? { ...item.review } : null,
  }));
}

function errorBody(status: number, path: string, message: string) {
  return {
    statusCode: status,
    code:
      status === 403
        ? 'FORBIDDEN'
        : status === 404
          ? 'NOT_FOUND'
          : status === 409
            ? 'CONFLICT'
            : 'INTERNAL_ERROR',
    message,
    path,
    timestamp: '2026-09-05T00:00:00.000Z',
    requestId: 'req-check-in',
  };
}

function hasSubstantive(item: CheckInResponseDto): boolean {
  const responses = item.responses;
  return (
    responses.sleepQuality != null ||
    responses.energyLevel != null ||
    responses.stressLevel != null ||
    responses.hungerLevel != null ||
    responses.recoveryLevel != null ||
    responses.trainingAdherencePct != null ||
    responses.nutritionAdherencePct != null ||
    Boolean(responses.wins?.trim()) ||
    Boolean(responses.challenges?.trim()) ||
    Boolean(responses.generalNotes?.trim())
  );
}

export const checkInHandlers = [
  http.get(API, async ({ request }) => {
    if (checkInMockState.delayMs > 0) {
      await delay(checkInMockState.delayMs);
    }
    if (checkInMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (checkInMockState.listStatus >= 400) {
      return HttpResponse.json(errorBody(checkInMockState.listStatus, '/api/v1/clients/me/check-ins', 'List failed'), {
        status: checkInMockState.listStatus,
      });
    }
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const start = (page - 1) * limit;
    const slice = checkInMockState.items.slice(start, start + limit);
    const body = paginateCheckIns(slice, page, limit);
    body.meta.totalItems = checkInMockState.items.length;
    body.meta.totalPages =
      checkInMockState.items.length > 0 ? Math.ceil(checkInMockState.items.length / limit) : 0;
    return HttpResponse.json(body);
  }),

  http.post(API, async ({ request }) => {
    if (checkInMockState.failNetwork) {
      return HttpResponse.error();
    }
    const payload = (await request.json()) as CreateCheckInDto;
    checkInMockState.lastCreatePayload = payload;
    if (checkInMockState.createStatus === 409) {
      return HttpResponse.json(
        errorBody(409, '/api/v1/clients/me/check-ins', 'Duplicate period internals'),
        { status: 409 },
      );
    }
    if (checkInMockState.createStatus >= 400) {
      return HttpResponse.json(
        errorBody(checkInMockState.createStatus, '/api/v1/clients/me/check-ins', 'Create failed'),
        { status: checkInMockState.createStatus },
      );
    }
    const created: CheckInResponseDto = {
      id: CREATED_CHECK_IN_ID,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      status: CheckInResponseDtoStatus.DRAFT,
      responses: {
        sleepQuality: null,
        energyLevel: null,
        stressLevel: null,
        hungerLevel: null,
        recoveryLevel: null,
        trainingAdherencePct: null,
        nutritionAdherencePct: null,
        wins: null,
        challenges: null,
        generalNotes: null,
      },
      submittedAt: null,
      review: null,
      createdAt: '2026-09-05T12:00:00.000Z',
      updatedAt: '2026-09-05T12:00:00.000Z',
    };
    checkInMockState.items = [created, ...checkInMockState.items];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API}/:checkInId`, async ({ params }) => {
    if (checkInMockState.delayMs > 0) {
      await delay(checkInMockState.delayMs);
    }
    if (checkInMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (checkInMockState.detailStatus >= 400) {
      return HttpResponse.json(
        errorBody(checkInMockState.detailStatus, `/api/v1/clients/me/check-ins/${params.checkInId}`, 'Detail failed'),
        { status: checkInMockState.detailStatus },
      );
    }
    const found = checkInMockState.items.find((item) => item.id === String(params.checkInId));
    if (!found) {
      return HttpResponse.json(
        errorBody(404, `/api/v1/clients/me/check-ins/${params.checkInId}`, 'Not found internals'),
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.patch(`${API}/:checkInId/status`, async ({ params, request }) => {
    const payload = (await request.json()) as UpdateCheckInStatusDto;
    checkInMockState.lastStatusPayload = payload;
    checkInMockState.submitCount += 1;
    if (checkInMockState.submitStatus >= 400) {
      return HttpResponse.json(
        errorBody(
          checkInMockState.submitStatus,
          `/api/v1/clients/me/check-ins/${params.checkInId}/status`,
          'Status failed internals',
        ),
        { status: checkInMockState.submitStatus },
      );
    }
    const id = String(params.checkInId);
    const current = checkInMockState.items.find((item) => item.id === id);
    if (!current) {
      return HttpResponse.json(errorBody(404, `/api/v1/clients/me/check-ins/${id}/status`, 'Not found'), {
        status: 404,
      });
    }
    if (current.status === CheckInResponseDtoStatus.REVIEWED) {
      return HttpResponse.json(errorBody(409, `/api/v1/clients/me/check-ins/${id}/status`, 'Reviewed internals'), {
        status: 409,
      });
    }
    if (current.status === CheckInResponseDtoStatus.DRAFT && !hasSubstantive(current)) {
      return HttpResponse.json(
        errorBody(400, `/api/v1/clients/me/check-ins/${id}/status`, 'At least one response is required'),
        { status: 400 },
      );
    }
    const submitted: CheckInResponseDto = {
      ...current,
      status: CheckInResponseDtoStatus.SUBMITTED,
      submittedAt: current.submittedAt ?? '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
    };
    checkInMockState.items = checkInMockState.items.map((item) => (item.id === id ? submitted : item));
    return HttpResponse.json(submitted);
  }),

  http.patch(`${API}/:checkInId`, async ({ params, request }) => {
    const payload = (await request.json()) as UpdateCheckInDto;
    checkInMockState.lastUpdatePayload = payload;
    if (checkInMockState.updateStatus >= 400) {
      return HttpResponse.json(
        errorBody(checkInMockState.updateStatus, `/api/v1/clients/me/check-ins/${params.checkInId}`, 'Update failed internals'),
        { status: checkInMockState.updateStatus },
      );
    }
    const id = String(params.checkInId);
    const current = checkInMockState.items.find((item) => item.id === id);
    if (!current) {
      return HttpResponse.json(errorBody(404, `/api/v1/clients/me/check-ins/${id}`, 'Not found'), { status: 404 });
    }
    if (current.status !== CheckInResponseDtoStatus.DRAFT) {
      return HttpResponse.json(errorBody(409, `/api/v1/clients/me/check-ins/${id}`, 'Immutable internals'), {
        status: 409,
      });
    }
    const next: CheckInResponseDto = {
      ...current,
      periodStart: payload.periodStart ?? current.periodStart,
      periodEnd: payload.periodEnd ?? current.periodEnd,
      responses: {
        ...current.responses,
        sleepQuality:
          payload.sleepQuality === undefined
            ? current.responses.sleepQuality
            : (payload.sleepQuality as number | null),
        energyLevel:
          payload.energyLevel === undefined
            ? current.responses.energyLevel
            : (payload.energyLevel as number | null),
        stressLevel:
          payload.stressLevel === undefined
            ? current.responses.stressLevel
            : (payload.stressLevel as number | null),
        hungerLevel:
          payload.hungerLevel === undefined
            ? current.responses.hungerLevel
            : (payload.hungerLevel as number | null),
        recoveryLevel:
          payload.recoveryLevel === undefined
            ? current.responses.recoveryLevel
            : (payload.recoveryLevel as number | null),
        trainingAdherencePct:
          payload.trainingAdherencePct === undefined
            ? current.responses.trainingAdherencePct
            : (payload.trainingAdherencePct as number | null),
        nutritionAdherencePct:
          payload.nutritionAdherencePct === undefined
            ? current.responses.nutritionAdherencePct
            : (payload.nutritionAdherencePct as number | null),
        wins: payload.wins === undefined ? current.responses.wins : (payload.wins as string | null),
        challenges:
          payload.challenges === undefined ? current.responses.challenges : (payload.challenges as string | null),
        generalNotes:
          payload.generalNotes === undefined
            ? current.responses.generalNotes
            : (payload.generalNotes as string | null),
      },
      updatedAt: '2026-09-05T12:30:00.000Z',
    };
    checkInMockState.items = checkInMockState.items.map((item) => (item.id === id ? next : item));
    return HttpResponse.json(next);
  }),

  http.delete(`${API}/:checkInId`, ({ params }) => {
    const id = String(params.checkInId);
    const current = checkInMockState.items.find((item) => item.id === id);
    if (!current) {
      return HttpResponse.json(errorBody(404, `/api/v1/clients/me/check-ins/${id}`, 'Not found'), { status: 404 });
    }
    if (current.status !== CheckInResponseDtoStatus.DRAFT) {
      return HttpResponse.json(errorBody(409, `/api/v1/clients/me/check-ins/${id}`, 'Cannot delete internals'), {
        status: 409,
      });
    }
    checkInMockState.items = checkInMockState.items.filter((item) => item.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];

export { emptyCheckInList, populatedCheckIns };
