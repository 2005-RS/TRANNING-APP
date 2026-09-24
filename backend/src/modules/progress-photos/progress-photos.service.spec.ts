import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ObjectStorageUnavailableException } from '../../storage/object-storage.errors';
import { ProgressPhoto } from './entities/progress-photo.entity';
import { ProgressPhotoPose } from './enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from './enums/progress-photo-status.enum';
import { ProgressPhotosService } from './progress-photos.service';

function actor(
  overrides: Partial<AuthenticatedUser> & { id: string; role: UserRole },
): AuthenticatedUser {
  return {
    email: 'client@example.com',
    firstName: 'Cara',
    lastName: 'Client',
    status: UserStatus.ACTIVE,
    sessionId: 'session-1',
    ...overrides,
  };
}

const client = actor({ id: 'user-1', role: UserRole.CLIENT });

function photoRow(overrides: Partial<ProgressPhoto> = {}): ProgressPhoto {
  return {
    id: 'photo-1',
    clientProfileId: 'client-1',
    bodyMeasurementId: null,
    pose: ProgressPhotoPose.FRONT,
    status: ProgressPhotoStatus.PENDING_UPLOAD,
    storageKey: 'progress-photos/client-1/photo-1/file.jpg',
    originalFileName: 'front.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: null,
    capturedAt: new Date('2026-08-01T12:00:00.000Z'),
    finalizedAt: null,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    ...overrides,
  } as ProgressPhoto;
}

describe('ProgressPhotosService', () => {
  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    delete?: jest.Mock;
    createUploadRequest?: jest.Mock;
    headObject?: jest.Mock;
    deleteObject?: jest.Mock;
    createReadUrl?: jest.Mock;
    requireOwnedByClient?: jest.Mock;
  }) {
    const photos = {
      create: jest.fn((value: Partial<ProgressPhoto>) => value),
      save:
        overrides?.save ??
        jest.fn(async (value: ProgressPhoto) => ({
          ...photoRow(),
          ...value,
        })),
      findOne: overrides?.findOne ?? jest.fn().mockResolvedValue(photoRow()),
      delete: overrides?.delete ?? jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    const clients = {
      findByUserIdWithUser: jest.fn().mockResolvedValue({
        id: 'client-1',
        user: { status: UserStatus.ACTIVE },
      }),
      findByIdWithUser: jest.fn().mockResolvedValue({ id: 'client-1' }),
    };
    const access = { assertCanAccessClient: jest.fn() };
    const measurements = {
      requireOwnedByClient:
        overrides?.requireOwnedByClient ??
        jest.fn().mockResolvedValue({ id: 'm-1' }),
    };
    const storage = {
      createUploadRequest:
        overrides?.createUploadRequest ??
        jest.fn().mockResolvedValue({
          method: 'POST',
          url: 'http://127.0.0.1/upload',
          fields: { key: 'progress-photos/client-1/photo-1/file.jpg' },
          expiresAt: new Date('2026-01-01T00:10:00.000Z'),
        }),
      headObject: overrides?.headObject ?? jest.fn().mockResolvedValue(null),
      deleteObject:
        overrides?.deleteObject ?? jest.fn().mockResolvedValue(undefined),
      createReadUrl:
        overrides?.createReadUrl ??
        jest.fn().mockResolvedValue({
          url: 'http://127.0.0.1/read',
          expiresAt: new Date('2026-01-01T00:02:00.000Z'),
        }),
    };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, number> = {
          EXERCISE_MEDIA_UPLOAD_TTL_SECONDS: 600,
          EXERCISE_MEDIA_READ_TTL_SECONDS: 120,
          PROGRESS_PHOTO_MAX_BYTES: 10485760,
        };
        return values[key];
      }),
    };

    return {
      service: new ProgressPhotosService(
        photos as never,
        clients as never,
        access as never,
        measurements as never,
        storage as never,
        config as never,
      ),
      photos,
      measurements,
      storage,
    };
  }

  const uploadDto = {
    originalFileName: '../../front.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 2500,
    pose: ProgressPhotoPose.FRONT,
  };

  it('creates PENDING_UPLOAD metadata and a signed POST without exposing storage internals', async () => {
    const { service, storage, photos } = buildService();
    const result = await service.createUploadRequest(uploadDto, client);

    expect(result.photo.status).toBe(ProgressPhotoStatus.PENDING_UPLOAD);
    expect(result.photo).not.toHaveProperty('storageKey');
    expect(result.upload.method).toBe('POST');
    expect(storage.createUploadRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/jpeg',
        maxBytes: 10485760,
        expiresInSeconds: 600,
      }),
    );
    const saved = photos.save.mock.calls[0][0] as ProgressPhoto;
    expect(saved.storageKey).toMatch(
      /^progress-photos\/client-1\/.+\/.+\.jpg$/,
    );
    expect(saved.storageKey).not.toContain('front.jpg');
    expect(saved.originalFileName).toBe('front.jpg');
  });

  it('rejects invalid MIME, oversized declarations, and foreign measurements', async () => {
    const { service } = buildService();
    await expect(
      service.createUploadRequest(
        { ...uploadDto, mimeType: 'image/svg+xml' },
        client,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createUploadRequest(
        { ...uploadDto, fileSizeBytes: 10485761 },
        client,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);

    const missingMeasurement = buildService({
      requireOwnedByClient: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Body measurement not found')),
    });
    await expect(
      missingMeasurement.service.createUploadRequest(
        {
          ...uploadDto,
          bodyMeasurementId: '33333333-3333-4333-8333-333333333333',
        },
        client,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the pending row when signed-request generation fails', async () => {
    const { service, photos } = buildService({
      createUploadRequest: jest
        .fn()
        .mockRejectedValue(new ObjectStorageUnavailableException()),
    });
    await expect(
      service.createUploadRequest(uploadDto, client),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(photos.delete).toHaveBeenCalled();
  });

  it('finalizes a valid object, stays pending when missing, and fails incompatible metadata', async () => {
    const pending = photoRow();
    const readyService = buildService({
      findOne: jest.fn().mockResolvedValue(pending),
      headObject: jest.fn().mockResolvedValue({
        key: pending.storageKey,
        contentLength: 2048,
        contentType: 'image/jpeg',
      }),
    });
    const ready = await readyService.service.finalizeMine('photo-1', client);
    expect(ready.status).toBe(ProgressPhotoStatus.READY);
    expect(ready.fileSizeBytes).toBe(2048);

    const missing = buildService({
      findOne: jest.fn().mockResolvedValue(photoRow()),
      headObject: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.finalizeMine('photo-1', client),
    ).rejects.toBeInstanceOf(ConflictException);

    const badType = buildService({
      findOne: jest.fn().mockResolvedValue(photoRow()),
      headObject: jest.fn().mockResolvedValue({
        key: pending.storageKey,
        contentLength: 2048,
        contentType: 'image/png',
      }),
    });
    await expect(
      badType.service.finalizeMine('photo-1', client),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(badType.storage.deleteObject).toHaveBeenCalledWith(
      pending.storageKey,
    );
  });

  it('deletes the object before metadata', async () => {
    const { service, storage, photos } = buildService({
      findOne: jest.fn().mockResolvedValue(photoRow()),
    });
    await service.removeMine('photo-1', client);
    expect(storage.deleteObject).toHaveBeenCalled();
    expect(photos.delete).toHaveBeenCalledWith('photo-1');
  });
});
