import type {
  BodyMeasurementResponseDto,
  PaginatedBodyMeasurementsResponseDto,
  PaginatedProgressPhotosResponseDto,
  ProgressPhotoResponseDto,
} from '@/generated/models';
import {
  ProgressPhotoResponseDtoPose,
  ProgressPhotoResponseDtoStatus,
} from '@/generated/models';

export const PIXEL_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const emptyMeasurementList: PaginatedBodyMeasurementsResponseDto = {
  data: [],
  meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
};

export const populatedMeasurements: BodyMeasurementResponseDto[] = [
  {
    id: 'b1111111-bbbb-4111-8111-b11111111111',
    measuredAt: '2026-09-03T08:00:00.000Z',
    bodyWeightKg: 81.25,
    bodyFatPercentage: 16.5,
    waistCm: 81.2,
    chestCm: 102,
    notes: null,
    createdAt: '2026-09-03T08:00:00.000Z',
    updatedAt: '2026-09-03T08:00:00.000Z',
  },
  {
    id: 'b2222222-bbbb-4111-8111-b22222222222',
    measuredAt: '2026-08-12T08:00:00.000Z',
    bodyWeightKg: 82.4,
    bodyFatPercentage: null,
    waistCm: 82,
    notes: 'Tape at navel.',
    createdAt: '2026-08-12T08:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
  },
];

export const populatedMeasurementList: PaginatedBodyMeasurementsResponseDto = {
  data: populatedMeasurements,
  meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
};

export const partialMeasurementList: PaginatedBodyMeasurementsResponseDto = {
  data: [
    {
      id: 'b3333333-bbbb-4111-8111-b33333333333',
      measuredAt: '2026-09-01T08:00:00.000Z',
      bodyWeightKg: 80,
      bodyFatPercentage: null,
      waistCm: null,
      notes: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
};

export const emptyPhotoList: PaginatedProgressPhotosResponseDto = {
  data: [],
  meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
};

export const readyPhotos: ProgressPhotoResponseDto[] = [
  {
    id: 'p1111111-aaaa-4111-8111-p11111111111',
    pose: ProgressPhotoResponseDtoPose.FRONT,
    status: ProgressPhotoResponseDtoStatus.READY,
    mimeType: 'image/jpeg',
    fileSizeBytes: 2400,
    capturedAt: '2026-08-01T12:00:00.000Z',
    bodyMeasurementId: 'b2222222-bbbb-4111-8111-b22222222222',
    finalizedAt: '2026-08-01T12:01:00.000Z',
    createdAt: '2026-08-01T12:00:00.000Z',
  },
  {
    id: 'p2222222-aaaa-4111-8111-p22222222222',
    pose: ProgressPhotoResponseDtoPose.FRONT,
    status: ProgressPhotoResponseDtoStatus.READY,
    mimeType: 'image/jpeg',
    fileSizeBytes: 2600,
    capturedAt: '2026-09-03T12:00:00.000Z',
    bodyMeasurementId: null,
    finalizedAt: '2026-09-03T12:01:00.000Z',
    createdAt: '2026-09-03T12:00:00.000Z',
  },
];

export const populatedReadyPhotos: PaginatedProgressPhotosResponseDto = {
  data: readyPhotos,
  meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
};

export const pendingPhoto: ProgressPhotoResponseDto = {
  id: 'p3333333-aaaa-4111-8111-p33333333333',
  pose: ProgressPhotoResponseDtoPose.SIDE,
  status: ProgressPhotoResponseDtoStatus.PENDING_UPLOAD,
  mimeType: 'image/jpeg',
  fileSizeBytes: null,
  capturedAt: '2026-09-04T12:00:00.000Z',
  bodyMeasurementId: null,
  finalizedAt: null,
  createdAt: '2026-09-04T12:00:00.000Z',
};
