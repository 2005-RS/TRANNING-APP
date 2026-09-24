import { delay, http, HttpResponse } from 'msw';
import type {
  BodyMeasurementResponseDto,
  PaginatedBodyMeasurementsResponseDto,
  PaginatedProgressPhotosResponseDto,
  ProgressPhotoResponseDto,
} from '@/generated/models';
import {
  ProgressPhotoResponseDtoStatus,
} from '@/generated/models';
import {
  emptyPhotoList,
  PIXEL_IMAGE,
} from '@/features/client-body/tests/fixtures';
import { progressMockState } from '@/features/client-progress/tests/msw-progress';

const API = 'http://localhost:3000/api/v1/clients/me';
export const MOCK_STORAGE_UPLOAD_URL = 'https://storage.test/upload';

type BodyMockState = {
  photosReady: PaginatedProgressPhotosResponseDto;
  photosPending: PaginatedProgressPhotosResponseDto;
  photosFailed: PaginatedProgressPhotosResponseDto;
  photosStatus: number;
  delayMs: number;
  failNetwork: boolean;
  failStorage: boolean;
  hangStorage: boolean;
  lastUploadRequest: Record<string, unknown> | null;
  lastStoragePosted: boolean;
  accessExpiresAt: string;
};

export const bodyMockState: BodyMockState = {
  photosReady: emptyPhotoList,
  photosPending: emptyPhotoList,
  photosFailed: emptyPhotoList,
  photosStatus: 200,
  delayMs: 0,
  failNetwork: false,
  failStorage: false,
  hangStorage: false,
  lastUploadRequest: null,
  lastStoragePosted: false,
  accessExpiresAt: '2099-01-01T00:00:00.000Z',
};

export function resetBodyMockState(): void {
  bodyMockState.photosReady = emptyPhotoList;
  bodyMockState.photosPending = emptyPhotoList;
  bodyMockState.photosFailed = emptyPhotoList;
  bodyMockState.photosStatus = 200;
  bodyMockState.delayMs = 0;
  bodyMockState.failNetwork = false;
  bodyMockState.failStorage = false;
  bodyMockState.hangStorage = false;
  bodyMockState.lastUploadRequest = null;
  bodyMockState.lastStoragePosted = false;
  bodyMockState.accessExpiresAt = '2099-01-01T00:00:00.000Z';
}

function errorBody(status: number, path: string, message: string) {
  return {
    statusCode: status,
    code: status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
    message,
    path,
    timestamp: '2026-09-04T00:00:00.000Z',
    requestId: 'req-body',
  };
}

function paginate(
  data: ProgressPhotoResponseDto[],
): PaginatedProgressPhotosResponseDto {
  return {
    data,
    meta: {
      page: 1,
      limit: 20,
      totalItems: data.length,
      totalPages: data.length > 0 ? 1 : 0,
    },
  };
}

export const bodyHandlers = [
  http.post(`${API}/body-measurements`, async ({ request }) => {
    const payload = (await request.json()) as BodyMeasurementResponseDto;
    const created: BodyMeasurementResponseDto = {
      id: 'b9999999-bbbb-4111-8111-b99999999999',
      measuredAt: payload.measuredAt ?? '2026-09-05T12:00:00.000Z',
      bodyWeightKg: payload.bodyWeightKg ?? null,
      bodyFatPercentage: payload.bodyFatPercentage ?? null,
      waistCm: payload.waistCm ?? null,
      notes: payload.notes ?? null,
      createdAt: '2026-09-05T12:00:00.000Z',
      updatedAt: '2026-09-05T12:00:00.000Z',
    };
    const current = progressMockState.body.data;
    progressMockState.body = {
      data: [created, ...current],
      meta: {
        page: 1,
        limit: 20,
        totalItems: current.length + 1,
        totalPages: 1,
      },
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${API}/body-measurements/:measurementId`, async ({ params, request }) => {
    const payload = (await request.json()) as Partial<BodyMeasurementResponseDto>;
    const id = String(params.measurementId);
    const current = progressMockState.body.data;
    const next = current.map((item) =>
      item.id === id ? { ...item, ...payload, updatedAt: '2026-09-05T13:00:00.000Z' } : item,
    );
    progressMockState.body = {
      ...progressMockState.body,
      data: next,
    };
    const updated = next.find((item) => item.id === id);
    return HttpResponse.json(updated ?? payload);
  }),

  http.get(`${API}/progress-photos`, async ({ request }) => {
    if (bodyMockState.delayMs > 0) {
      await delay(bodyMockState.delayMs);
    }
    if (bodyMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (bodyMockState.photosStatus >= 400) {
      return HttpResponse.json(
        errorBody(bodyMockState.photosStatus, '/api/v1/clients/me/progress-photos', 'Photos failed'),
        { status: bodyMockState.photosStatus },
      );
    }
    const url = request.url;
    if (url.includes(ProgressPhotoResponseDtoStatus.PENDING_UPLOAD)) {
      return HttpResponse.json(bodyMockState.photosPending);
    }
    if (url.includes(ProgressPhotoResponseDtoStatus.FAILED)) {
      return HttpResponse.json(bodyMockState.photosFailed);
    }
    return HttpResponse.json(bodyMockState.photosReady);
  }),

  http.post(`${API}/progress-photos/upload-requests`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, unknown>;
    bodyMockState.lastUploadRequest = payload;
    const photo: ProgressPhotoResponseDto = {
      id: 'p4444444-aaaa-4111-8111-p44444444444',
      pose: (payload.pose as ProgressPhotoResponseDto['pose']) ?? 'FRONT',
      status: ProgressPhotoResponseDtoStatus.PENDING_UPLOAD,
      mimeType: String(payload.mimeType ?? 'image/jpeg'),
      fileSizeBytes: null,
      capturedAt: String(payload.capturedAt ?? '2026-09-05T12:00:00.000Z'),
      bodyMeasurementId: typeof payload.bodyMeasurementId === 'string' ? payload.bodyMeasurementId : null,
      finalizedAt: null,
      createdAt: '2026-09-05T12:00:00.000Z',
    };
    return HttpResponse.json({
      photo,
      upload: {
        method: 'POST',
        url: MOCK_STORAGE_UPLOAD_URL,
        fields: { key: 'progress-photos/test/file.jpg', Policy: 'signed' },
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    });
  }),

  http.post(`${API}/progress-photos/:photoId/finalize`, ({ params }) => {
    const photo: ProgressPhotoResponseDto = {
      id: String(params.photoId),
      pose: 'FRONT',
      status: ProgressPhotoResponseDtoStatus.READY,
      mimeType: 'image/jpeg',
      fileSizeBytes: 2400,
      capturedAt: '2026-09-05T12:00:00.000Z',
      bodyMeasurementId: null,
      finalizedAt: '2026-09-05T12:01:00.000Z',
      createdAt: '2026-09-05T12:00:00.000Z',
    };
    const ready = [photo, ...bodyMockState.photosReady.data];
    bodyMockState.photosReady = paginate(ready);
    bodyMockState.photosPending = emptyPhotoList;
    return HttpResponse.json(photo);
  }),

  http.get(`${API}/progress-photos/:photoId/access`, () => {
    return HttpResponse.json({
      url: PIXEL_IMAGE,
      expiresAt: bodyMockState.accessExpiresAt,
    });
  }),

  http.delete(`${API}/progress-photos/:photoId`, ({ params }) => {
    const id = String(params.photoId);
    bodyMockState.photosReady = paginate(
      bodyMockState.photosReady.data.filter((item) => item.id !== id),
    );
    bodyMockState.photosPending = paginate(
      bodyMockState.photosPending.data.filter((item) => item.id !== id),
    );
    bodyMockState.photosFailed = paginate(
      bodyMockState.photosFailed.data.filter((item) => item.id !== id),
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(MOCK_STORAGE_UPLOAD_URL, async () => {
    if (bodyMockState.hangStorage) {
      await delay('infinite');
    }
    if (bodyMockState.failStorage) {
      return new HttpResponse(null, { status: 403 });
    }
    bodyMockState.lastStoragePosted = true;
    return new HttpResponse(null, { status: 204 });
  }),
];

export function setMeasurementList(list: PaginatedBodyMeasurementsResponseDto): void {
  progressMockState.body = list;
}
