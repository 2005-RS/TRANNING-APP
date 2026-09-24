import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { EnvironmentVariables } from '../../config/env.validation';
import {
  utcDayEndExclusive,
  utcDayStart,
} from '../body-measurements/date-range.util';
import { parseStrictIsoDateTime } from '../body-measurements/iso-datetime.validators';
import { BodyMeasurementsService } from '../body-measurements/body-measurements.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import { ObjectStorageUnavailableException } from '../../storage/object-storage.errors';
import { OBJECT_STORAGE } from '../../storage/object-storage.tokens';
import {
  ObjectStorageService,
  StoredObjectMetadata,
} from '../../storage/object-storage.types';
import {
  CreateProgressPhotoUploadRequestDto,
  ListProgressPhotosQueryDto,
} from './dto/progress-photo-input.dto';
import {
  PaginatedProgressPhotosResponseDto,
  ProgressPhotoAccessResponseDto,
  ProgressPhotoResponseDto,
  ProgressPhotoUploadRequestResponseDto,
} from './dto/progress-photo-response.dto';
import { ProgressPhoto } from './entities/progress-photo.entity';
import { ProgressPhotoStatus } from './enums/progress-photo-status.enum';
import { PROGRESS_PHOTO_FUTURE_SKEW_MS } from './progress-photos.constants';
import {
  buildProgressPhotoStorageKey,
  isAllowedProgressPhotoMime,
  sanitizeOriginalFileName,
} from './progress-photos-key.util';
import {
  paginationMeta,
  toProgressPhotoResponse,
} from './progress-photos.mapper';

@Injectable()
export class ProgressPhotosService {
  private readonly logger = new Logger(ProgressPhotosService.name);

  constructor(
    @InjectRepository(ProgressPhoto)
    private readonly photos: Repository<ProgressPhoto>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
    private readonly measurements: BodyMeasurementsService,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorageService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createUploadRequest(
    dto: CreateProgressPhotoUploadRequestDto,
    actor: AuthenticatedUser,
  ): Promise<ProgressPhotoUploadRequestResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);

    const mimeType = dto.mimeType.trim().toLowerCase();
    if (!isAllowedProgressPhotoMime(mimeType)) {
      throw new BadRequestException('MIME type is not allowed');
    }

    const maxBytes = this.maxBytes();
    if (dto.fileSizeBytes > maxBytes) {
      throw new PayloadTooLargeException('File exceeds the allowed size');
    }

    const originalFileName = sanitizeOriginalFileName(dto.originalFileName);
    if (originalFileName.length === 0) {
      throw new BadRequestException('originalFileName is invalid');
    }

    let bodyMeasurementId: string | null = null;
    if (dto.bodyMeasurementId) {
      await this.measurements.requireOwnedByClient(
        dto.bodyMeasurementId,
        profile.id,
      );
      bodyMeasurementId = dto.bodyMeasurementId;
    }

    const photoId = randomUUID();
    const storageKey = buildProgressPhotoStorageKey(
      profile.id,
      photoId,
      mimeType,
    );
    const saved = await this.photos.save(
      this.photos.create({
        id: photoId,
        clientProfileId: profile.id,
        bodyMeasurementId,
        pose: dto.pose,
        status: ProgressPhotoStatus.PENDING_UPLOAD,
        storageKey,
        originalFileName,
        mimeType,
        fileSizeBytes: null,
        capturedAt: this.resolveCapturedAt(dto.capturedAt),
        finalizedAt: null,
      }),
    );

    try {
      const upload = await this.storage.createUploadRequest({
        key: storageKey,
        contentType: mimeType,
        maxBytes,
        expiresInSeconds: this.config.getOrThrow(
          'EXERCISE_MEDIA_UPLOAD_TTL_SECONDS',
          { infer: true },
        ),
      });

      this.logger.log(
        JSON.stringify({
          event: 'progress_photo_upload_requested',
          photoId: saved.id,
          clientProfileId: profile.id,
        }),
      );

      return {
        photo: toProgressPhotoResponse(saved),
        upload,
      };
    } catch (error) {
      await this.photos.delete(saved.id);
      this.rethrowStorage(error);
    }
  }

  async listMine(
    query: ListProgressPhotosQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedProgressPhotosResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.listForClient(profile.id, query, {
      defaultStatus: query.status ?? ProgressPhotoStatus.READY,
    });
  }

  async listForClient(
    clientProfileId: string,
    query: ListProgressPhotosQueryDto,
    options?: {
      actor?: AuthenticatedUser;
      defaultStatus?: ProgressPhotoStatus;
    },
  ): Promise<PaginatedProgressPhotosResponseDto> {
    if (options?.actor) {
      await this.assertActorCanReadClient(options.actor, clientProfileId);
    }
    this.assertDateRange(query.dateFrom, query.dateTo);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const status = options?.defaultStatus ?? ProgressPhotoStatus.READY;
    const qb = this.photos
      .createQueryBuilder('photo')
      .where('photo.clientProfileId = :clientProfileId', { clientProfileId })
      .andWhere('photo.status = :status', { status });

    if (query.pose) {
      qb.andWhere('photo.pose = :pose', { pose: query.pose });
    }
    if (query.bodyMeasurementId) {
      qb.andWhere('photo.bodyMeasurementId = :bodyMeasurementId', {
        bodyMeasurementId: query.bodyMeasurementId,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('photo.capturedAt >= :dateFrom', {
        dateFrom: utcDayStart(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere('photo.capturedAt < :dateToExclusive', {
        dateToExclusive: utcDayEndExclusive(query.dateTo),
      });
    }

    qb.orderBy('photo.capturedAt', 'DESC')
      .addOrderBy('photo.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => toProgressPhotoResponse(row)),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  async listForManagement(
    clientProfileId: string,
    query: ListProgressPhotosQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedProgressPhotosResponseDto> {
    return this.listForClient(clientProfileId, query, {
      actor,
      defaultStatus: ProgressPhotoStatus.READY,
    });
  }

  async getMine(
    photoId: string,
    actor: AuthenticatedUser,
  ): Promise<ProgressPhotoResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const photo = await this.requireOwned(profile.id, photoId);
    return toProgressPhotoResponse(photo);
  }

  async finalizeMine(
    photoId: string,
    actor: AuthenticatedUser,
  ): Promise<ProgressPhotoResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const photo = await this.requireOwned(profile.id, photoId);

    if (photo.status === ProgressPhotoStatus.FAILED) {
      throw new ConflictException('Photo upload failed');
    }

    const object = await this.headOrThrow(photo.storageKey);

    if (photo.status === ProgressPhotoStatus.READY) {
      this.assertObjectMatches(photo, object);
      return toProgressPhotoResponse(photo);
    }

    if (!object) {
      throw new ConflictException('Uploaded object was not found');
    }

    try {
      this.assertObjectMatches(photo, object);
    } catch (error) {
      await this.markFailedAndCleanup(photo);
      throw error;
    }

    photo.fileSizeBytes = object.contentLength;
    photo.status = ProgressPhotoStatus.READY;
    photo.finalizedAt = new Date();
    const saved = await this.photos.save(photo);

    this.logger.log(
      JSON.stringify({
        event: 'progress_photo_finalized',
        photoId: saved.id,
        clientProfileId: profile.id,
      }),
    );

    return toProgressPhotoResponse(saved);
  }

  async createAccessUrlMine(
    photoId: string,
    actor: AuthenticatedUser,
  ): Promise<ProgressPhotoAccessResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.createAccessUrl(profile.id, photoId);
  }

  async createAccessUrlForClient(
    clientProfileId: string,
    photoId: string,
    actor: AuthenticatedUser,
  ): Promise<ProgressPhotoAccessResponseDto> {
    await this.assertActorCanReadClient(actor, clientProfileId);
    return this.createAccessUrl(clientProfileId, photoId);
  }

  async removeMine(photoId: string, actor: AuthenticatedUser): Promise<void> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const photo = await this.requireOwned(profile.id, photoId);

    try {
      await this.storage.deleteObject(photo.storageKey);
    } catch (error) {
      this.rethrowStorage(error);
    }

    try {
      await this.photos.delete(photo.id);
    } catch {
      this.logger.error(
        JSON.stringify({
          event: 'progress_photo_metadata_delete_failed',
          photoId: photo.id,
          clientProfileId: profile.id,
        }),
      );
      throw new InternalServerErrorException(
        'Unable to delete progress photo metadata',
      );
    }

    this.logger.log(
      JSON.stringify({
        event: 'progress_photo_deleted',
        photoId: photo.id,
        clientProfileId: profile.id,
      }),
    );
  }

  private async createAccessUrl(
    clientProfileId: string,
    photoId: string,
  ): Promise<ProgressPhotoAccessResponseDto> {
    const photo = await this.requireOwned(clientProfileId, photoId);
    if (photo.status !== ProgressPhotoStatus.READY) {
      throw new ConflictException('Photo is not ready');
    }

    try {
      return await this.storage.createReadUrl(
        photo.storageKey,
        this.config.getOrThrow('EXERCISE_MEDIA_READ_TTL_SECONDS', {
          infer: true,
        }),
      );
    } catch (error) {
      this.rethrowStorage(error);
    }
  }

  private async requireOwned(
    clientProfileId: string,
    photoId: string,
  ): Promise<ProgressPhoto> {
    const photo = await this.photos.findOne({
      where: { id: photoId, clientProfileId },
    });
    if (!photo) {
      throw new NotFoundException('Progress photo not found');
    }
    return photo;
  }

  private async headOrThrow(key: string): Promise<StoredObjectMetadata | null> {
    try {
      return await this.storage.headObject(key);
    } catch (error) {
      this.rethrowStorage(error);
    }
  }

  private assertObjectMatches(
    photo: ProgressPhoto,
    object: StoredObjectMetadata | null,
  ): asserts object is StoredObjectMetadata {
    if (!object) {
      throw new ConflictException('Uploaded object was not found');
    }

    const reportedType = object.contentType
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    if (!reportedType || reportedType !== photo.mimeType) {
      throw new BadRequestException('Object content type is not allowed');
    }

    const maxBytes = this.maxBytes();
    if (object.contentLength < 1 || object.contentLength > maxBytes) {
      throw new PayloadTooLargeException('File exceeds the allowed size');
    }
  }

  private async markFailedAndCleanup(photo: ProgressPhoto): Promise<void> {
    photo.status = ProgressPhotoStatus.FAILED;
    await this.photos.save(photo);
    try {
      await this.storage.deleteObject(photo.storageKey);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'progress_photo_cleanup_failed',
          photoId: photo.id,
          clientProfileId: photo.clientProfileId,
        }),
      );
      if (!(error instanceof ObjectStorageUnavailableException)) {
        throw error;
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'progress_photo_verification_failed',
        photoId: photo.id,
        clientProfileId: photo.clientProfileId,
      }),
    );
  }

  private resolveCapturedAt(value?: string): Date {
    if (value === undefined) {
      return new Date();
    }
    const parsed = parseStrictIsoDateTime(value);
    if (!parsed) {
      throw new BadRequestException('capturedAt is invalid');
    }
    if (parsed.getTime() > Date.now() + PROGRESS_PHOTO_FUTURE_SKEW_MS) {
      throw new BadRequestException(
        'capturedAt cannot be more than 5 minutes in the future',
      );
    }
    return parsed;
  }

  private maxBytes(): number {
    return this.config.getOrThrow('PROGRESS_PHOTO_MAX_BYTES', { infer: true });
  }

  private async assertActorCanReadClient(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<void> {
    if (actor.role === UserRole.CLIENT) {
      throw new ForbiddenException();
    }

    if (actor.role === UserRole.TRAINER) {
      await this.access.assertCanAccessClient(actor.id, clientProfileId);
    }

    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private assertClientActor(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.CLIENT) {
      throw new ForbiddenException();
    }
  }

  private async requireOwnClientProfile(
    actor: AuthenticatedUser,
  ): Promise<ClientProfile> {
    const profile = await this.clients.findByUserIdWithUser(actor.id);
    if (!profile) {
      this.logger.error(
        JSON.stringify({
          event: 'client_profile_missing',
          userId: actor.id,
        }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private assertDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
  }

  private rethrowStorage(error: unknown): never {
    if (error instanceof ObjectStorageUnavailableException) {
      throw new InternalServerErrorException('Object storage is unavailable');
    }
    throw error;
  }
}
