import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';
import { ExerciseStatus } from '../enums/exercise-status.enum';
import { ExerciseMedia } from './entities/exercise-media.entity';
import { ExerciseMediaStatus } from './enums/exercise-media-status.enum';
import { ExerciseMediaType } from './enums/exercise-media-type.enum';
import { ExerciseMediaService } from './exercise-media.service';
import { ObjectStorageUnavailableException } from '../../../storage/object-storage.errors';

function actor(
  overrides: Partial<AuthenticatedUser> & { id: string; role: UserRole },
): AuthenticatedUser {
  return {
    email: 'user@example.com',
    firstName: 'Pat',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    sessionId: 'session-1',
    ...overrides,
  };
}

const trainer = actor({ id: 'trainer-1', role: UserRole.TRAINER });

function mediaRow(overrides: Partial<ExerciseMedia> = {}): ExerciseMedia {
  return {
    id: 'media-1',
    exerciseId: 'ex-1',
    mediaType: ExerciseMediaType.VIDEO,
    storageKey: 'exercises/ex-1/media-1/file.mp4',
    originalFileName: 'bench.mp4',
    mimeType: 'video/mp4',
    fileSizeBytes: null,
    status: ExerciseMediaStatus.PENDING_UPLOAD,
    displayOrder: 0,
    createdByUserId: 'trainer-1',
    finalizedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as ExerciseMedia;
}

describe('ExerciseMediaService', () => {
  function buildService(overrides?: {
    save?: jest.Mock;
    findOne?: jest.Mock;
    count?: jest.Mock;
    delete?: jest.Mock;
    find?: jest.Mock;
    requireExerciseMutationAccess?: jest.Mock;
    requireExerciseById?: jest.Mock;
    createUploadRequest?: jest.Mock;
    headObject?: jest.Mock;
    deleteObject?: jest.Mock;
    createReadUrl?: jest.Mock;
    sessionExists?: boolean;
    planExists?: boolean;
  }) {
    const media = {
      create: jest.fn((value: Partial<ExerciseMedia>) => value),
      save:
        overrides?.save ??
        jest.fn(async (value: ExerciseMedia) => ({
          ...value,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      findOne: overrides?.findOne ?? jest.fn(),
      find: overrides?.find ?? jest.fn(),
      count: overrides?.count ?? jest.fn().mockResolvedValue(0),
      delete: overrides?.delete ?? jest.fn().mockResolvedValue(undefined),
    };
    const existsRepo = (exists: boolean) => ({
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: jest.fn().mockResolvedValue(exists),
      })),
    });
    const exercises = {
      requireExerciseMutationAccess:
        overrides?.requireExerciseMutationAccess ??
        jest.fn().mockResolvedValue({
          id: 'ex-1',
          status: ExerciseStatus.ACTIVE,
          createdByUserId: 'trainer-1',
        }),
      requireExerciseById:
        overrides?.requireExerciseById ??
        jest.fn().mockResolvedValue({
          id: 'ex-1',
          status: ExerciseStatus.ACTIVE,
        }),
    };
    const storage = {
      createUploadRequest:
        overrides?.createUploadRequest ??
        jest.fn().mockResolvedValue({
          method: 'POST',
          url: 'http://127.0.0.1/upload',
          fields: { key: 'exercises/ex-1/media-1/file.mp4' },
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
          EXERCISE_VIDEO_MAX_BYTES: 262144000,
          EXERCISE_IMAGE_MAX_BYTES: 10485760,
        };
        return values[key];
      }),
    };

    return {
      service: new ExerciseMediaService(
        media as never,
        existsRepo(overrides?.sessionExists ?? false) as never,
        existsRepo(overrides?.planExists ?? false) as never,
        exercises as never,
        storage as never,
        config as never,
      ),
      media,
      exercises,
      storage,
    };
  }

  const uploadDto = {
    mediaType: ExerciseMediaType.VIDEO,
    fileName: '../../bench.mp4',
    mimeType: 'video/mp4',
    fileSizeBytes: 1024,
  };

  it('creates PENDING media and a signed POST without exposing storage internals', async () => {
    const { service, storage, media } = buildService();
    const result = await service.createUploadRequest(
      'ex-1',
      uploadDto,
      trainer,
    );

    expect(result.media.status).toBe(ExerciseMediaStatus.PENDING_UPLOAD);
    expect(result.media).not.toHaveProperty('storageKey');
    expect(result.upload.method).toBe('POST');
    expect(storage.createUploadRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'video/mp4',
        maxBytes: 262144000,
        expiresInSeconds: 600,
      }),
    );
    const saved = media.save.mock.calls[0][0] as ExerciseMedia;
    expect(saved.storageKey).toMatch(/^exercises\/ex-1\/.+\/.+\.mp4$/);
    expect(saved.storageKey).not.toContain('..');
    expect(saved.originalFileName).toBe('bench.mp4');
    expect(saved.createdByUserId).toBe('trainer-1');
  });

  it('rejects archived exercises, invalid MIME, oversized declarations, and media limits', async () => {
    const archived = buildService({
      requireExerciseMutationAccess: jest.fn().mockResolvedValue({
        id: 'ex-1',
        status: ExerciseStatus.ARCHIVED,
      }),
    });
    await expect(
      archived.service.createUploadRequest('ex-1', uploadDto, trainer),
    ).rejects.toBeInstanceOf(ConflictException);

    const { service } = buildService();
    await expect(
      service.createUploadRequest(
        'ex-1',
        { ...uploadDto, mimeType: 'application/octet-stream' },
        trainer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createUploadRequest(
        'ex-1',
        { ...uploadDto, fileSizeBytes: 262144001 },
        trainer,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);

    const limited = buildService({ count: jest.fn().mockResolvedValue(5) });
    await expect(
      limited.service.createUploadRequest('ex-1', uploadDto, trainer),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes the pending row when signed-request generation fails', async () => {
    const { service, media } = buildService({
      createUploadRequest: jest
        .fn()
        .mockRejectedValue(new ObjectStorageUnavailableException()),
    });

    await expect(
      service.createUploadRequest('ex-1', uploadDto, trainer),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(media.delete).toHaveBeenCalled();
  });

  it('finalizes a valid object, stays pending when missing, and fails incompatible metadata', async () => {
    const pending = mediaRow();
    const readyService = buildService({
      findOne: jest.fn().mockResolvedValue(pending),
      headObject: jest.fn().mockResolvedValue({
        key: pending.storageKey,
        contentLength: 2048,
        contentType: 'video/mp4',
      }),
    });
    const ready = await readyService.service.finalize(
      'ex-1',
      'media-1',
      trainer,
    );
    expect(ready.status).toBe(ExerciseMediaStatus.READY);
    expect(ready.fileSizeBytes).toBe(2048);

    const missing = buildService({
      findOne: jest.fn().mockResolvedValue(mediaRow()),
      headObject: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.finalize('ex-1', 'media-1', trainer),
    ).rejects.toBeInstanceOf(ConflictException);

    const badType = buildService({
      findOne: jest.fn().mockResolvedValue(mediaRow()),
      headObject: jest.fn().mockResolvedValue({
        key: pending.storageKey,
        contentLength: 2048,
        contentType: 'image/png',
      }),
    });
    await expect(
      badType.service.finalize('ex-1', 'media-1', trainer),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(badType.storage.deleteObject).toHaveBeenCalledWith(
      pending.storageKey,
    );
    expect(badType.media.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ExerciseMediaStatus.FAILED }),
    );

    const oversized = buildService({
      findOne: jest.fn().mockResolvedValue(mediaRow()),
      headObject: jest.fn().mockResolvedValue({
        key: pending.storageKey,
        contentLength: 262144001,
        contentType: 'video/mp4',
      }),
    });
    await expect(
      oversized.service.finalize('ex-1', 'media-1', trainer),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('is idempotent for already READY media with valid object metadata', async () => {
    const ready = mediaRow({
      status: ExerciseMediaStatus.READY,
      fileSizeBytes: 2048,
      finalizedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const { service, media } = buildService({
      findOne: jest.fn().mockResolvedValue(ready),
      headObject: jest.fn().mockResolvedValue({
        key: ready.storageKey,
        contentLength: 2048,
        contentType: 'video/mp4',
      }),
    });

    const result = await service.finalize('ex-1', 'media-1', trainer);
    expect(result.status).toBe(ExerciseMediaStatus.READY);
    expect(media.save).not.toHaveBeenCalled();
  });

  it('deletes the object before metadata and lists without storage keys', async () => {
    const { service, storage, media } = buildService({
      findOne: jest.fn().mockResolvedValue(mediaRow()),
      find: jest.fn().mockResolvedValue([mediaRow()]),
    });

    await service.remove('ex-1', 'media-1', trainer);
    expect(storage.deleteObject).toHaveBeenCalled();
    expect(media.delete).toHaveBeenCalledWith('media-1');

    const listed = await service.list('ex-1');
    expect(listed[0]).not.toHaveProperty('storageKey');
  });

  it('hides missing media as not found', async () => {
    const { service } = buildService({
      findOne: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.finalize('ex-1', 'missing', trainer),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('picks READY video demonstrations over images and skips empty ids', async () => {
    const { service } = buildService({
      find: jest.fn().mockResolvedValue([
        mediaRow({
          id: 'img-1',
          exerciseId: 'ex-1',
          mediaType: ExerciseMediaType.IMAGE,
          status: ExerciseMediaStatus.READY,
        }),
        mediaRow({
          id: 'vid-1',
          exerciseId: 'ex-1',
          mediaType: ExerciseMediaType.VIDEO,
          status: ExerciseMediaStatus.READY,
        }),
        mediaRow({
          id: 'vid-2',
          exerciseId: 'ex-2',
          mediaType: ExerciseMediaType.VIDEO,
          status: ExerciseMediaStatus.READY,
        }),
      ]),
    });

    const demos = await service.findReadyDemonstrations(['ex-1', 'ex-2', '']);
    expect(demos.get('ex-1')?.id).toBe('vid-1');
    expect(demos.get('ex-2')?.id).toBe('vid-2');
    expect(JSON.stringify([...demos.values()])).not.toContain('storageKey');
  });

  it('issues signed read URLs to CLIENT only for owned exercises', async () => {
    const ready = mediaRow({
      status: ExerciseMediaStatus.READY,
      fileSizeBytes: 2048,
    });
    const denied = buildService({
      findOne: jest.fn().mockResolvedValue(ready),
    });
    await expect(
      denied.service.createAccessUrl(
        'ex-1',
        'media-1',
        actor({ id: 'client-1', role: UserRole.CLIENT }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const allowed = buildService({
      findOne: jest.fn().mockResolvedValue(ready),
      sessionExists: true,
    });
    const access = await allowed.service.createAccessUrl(
      'ex-1',
      'media-1',
      actor({ id: 'client-1', role: UserRole.CLIENT }),
    );
    expect(access.url).toBe('http://127.0.0.1/read');
    expect(JSON.stringify(access)).not.toContain('storageKey');
  });
});
