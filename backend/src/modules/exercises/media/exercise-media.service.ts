import {
  BadRequestException,
  ConflictException,
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
import { In, Repository } from 'typeorm';
import { EnvironmentVariables } from '../../../config/env.validation';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { UserRole } from '../../users/enums/user-role.enum';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { TrainingPlanExercise } from '../../training-plans/entities/training-plan-exercise.entity';
import { WorkoutSessionExercise } from '../../workout-sessions/entities/workout-session-exercise.entity';
import { ObjectStorageUnavailableException } from '../../../storage/object-storage.errors';
import { OBJECT_STORAGE } from '../../../storage/object-storage.tokens';
import {
  ObjectStorageService,
  StoredObjectMetadata,
} from '../../../storage/object-storage.types';
import { ExerciseStatus } from '../enums/exercise-status.enum';
import { ExercisesService } from '../exercises.service';
import { CreateExerciseMediaUploadRequestDto } from './dto/create-exercise-media-upload-request.dto';
import {
  ExerciseMediaAccessResponseDto,
  ExerciseMediaResponseDto,
  ExerciseMediaUploadRequestResponseDto,
} from './dto/exercise-media-response.dto';
import { ExerciseMedia } from './entities/exercise-media.entity';
import { ExerciseMediaStatus } from './enums/exercise-media-status.enum';
import { ExerciseMediaType } from './enums/exercise-media-type.enum';
import {
  buildStorageKey,
  isAllowedMime,
  sanitizeOriginalFileName,
} from './exercise-media-key.util';
import { mediaCountLimit } from './exercise-media.constants';
import { toExerciseMediaResponse } from './exercise-media.mapper';

@Injectable()
export class ExerciseMediaService {
  private readonly logger = new Logger(ExerciseMediaService.name);

  constructor(
    @InjectRepository(ExerciseMedia)
    private readonly media: Repository<ExerciseMedia>,
    @InjectRepository(WorkoutSessionExercise)
    private readonly sessionExercises: Repository<WorkoutSessionExercise>,
    @InjectRepository(TrainingPlanExercise)
    private readonly planExercises: Repository<TrainingPlanExercise>,
    private readonly exercises: ExercisesService,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorageService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createUploadRequest(
    exerciseId: string,
    dto: CreateExerciseMediaUploadRequestDto,
    actor: AuthenticatedUser,
  ): Promise<ExerciseMediaUploadRequestResponseDto> {
    const exercise = await this.exercises.requireExerciseMutationAccess(
      exerciseId,
      actor,
    );
    if (exercise.status !== ExerciseStatus.ACTIVE) {
      throw new ConflictException('Exercise is archived');
    }

    const mimeType = dto.mimeType.trim().toLowerCase();
    if (!isAllowedMime(dto.mediaType, mimeType)) {
      throw new BadRequestException('MIME type is not allowed');
    }

    const maxBytes = this.maxBytesFor(dto.mediaType);
    if (dto.fileSizeBytes > maxBytes) {
      throw new PayloadTooLargeException('File exceeds the allowed size');
    }

    const originalFileName = sanitizeOriginalFileName(dto.fileName);
    if (originalFileName.length === 0) {
      throw new BadRequestException('fileName is invalid');
    }

    const occupied = await this.media.count({
      where: {
        exerciseId,
        mediaType: dto.mediaType,
        status: In([
          ExerciseMediaStatus.PENDING_UPLOAD,
          ExerciseMediaStatus.READY,
        ]),
      },
    });
    if (occupied >= mediaCountLimit(dto.mediaType)) {
      throw new ConflictException('Exercise media limit reached');
    }

    const mediaId = randomUUID();
    const storageKey = buildStorageKey(exerciseId, mediaId, mimeType);
    const saved = await this.media.save(
      this.media.create({
        id: mediaId,
        exerciseId,
        mediaType: dto.mediaType,
        storageKey,
        originalFileName,
        mimeType,
        fileSizeBytes: null,
        status: ExerciseMediaStatus.PENDING_UPLOAD,
        displayOrder: dto.displayOrder ?? 0,
        createdByUserId: actor.id,
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
          event: 'exercise_media_upload_initiated',
          mediaId: saved.id,
          exerciseId,
        }),
      );

      return {
        media: toExerciseMediaResponse(saved),
        upload,
      };
    } catch (error) {
      await this.media.delete(saved.id);
      this.rethrowStorage(error);
    }
  }

  async list(exerciseId: string): Promise<ExerciseMediaResponseDto[]> {
    await this.exercises.requireExerciseById(exerciseId);

    const rows = await this.media.find({
      where: { exerciseId },
      order: {
        mediaType: 'ASC',
        displayOrder: 'ASC',
        createdAt: 'ASC',
        id: 'ASC',
      },
    });

    return rows.map((row) => toExerciseMediaResponse(row));
  }

  async finalize(
    exerciseId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ): Promise<ExerciseMediaResponseDto> {
    await this.exercises.requireExerciseMutationAccess(exerciseId, actor);
    const media = await this.requireMediaOnExercise(exerciseId, mediaId);

    if (media.status === ExerciseMediaStatus.FAILED) {
      throw new ConflictException('Media upload failed');
    }

    const object = await this.headOrThrow(media.storageKey);

    if (media.status === ExerciseMediaStatus.READY) {
      this.assertObjectMatches(media, object);
      return toExerciseMediaResponse(media);
    }

    if (!object) {
      throw new ConflictException('Uploaded object was not found');
    }

    try {
      this.assertObjectMatches(media, object);
    } catch (error) {
      await this.markFailedAndCleanup(media);
      throw error;
    }

    media.fileSizeBytes = object.contentLength;
    media.status = ExerciseMediaStatus.READY;
    media.finalizedAt = new Date();
    const saved = await this.media.save(media);

    this.logger.log(
      JSON.stringify({
        event: 'exercise_media_finalized',
        mediaId: saved.id,
        exerciseId,
      }),
    );

    return toExerciseMediaResponse(saved);
  }

  async findReadyDemonstrations(
    exerciseIds: string[],
  ): Promise<Map<string, ExerciseMediaResponseDto>> {
    const uniqueIds = [...new Set(exerciseIds.filter((id) => id.length > 0))];
    const result = new Map<string, ExerciseMediaResponseDto>();
    if (uniqueIds.length === 0) {
      return result;
    }

    const rows = await this.media.find({
      where: {
        exerciseId: In(uniqueIds),
        status: ExerciseMediaStatus.READY,
      },
      order: {
        displayOrder: 'ASC',
        createdAt: 'ASC',
        id: 'ASC',
      },
    });

    for (const row of rows) {
      const current = result.get(row.exerciseId);
      if (!current) {
        result.set(row.exerciseId, toExerciseMediaResponse(row));
        continue;
      }
      if (
        current.mediaType !== ExerciseMediaType.VIDEO &&
        row.mediaType === ExerciseMediaType.VIDEO
      ) {
        result.set(row.exerciseId, toExerciseMediaResponse(row));
      }
    }

    return result;
  }

  async createAccessUrl(
    exerciseId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ): Promise<ExerciseMediaAccessResponseDto> {
    await this.assertCanReadMedia(exerciseId, actor);
    const media = await this.requireMediaOnExercise(exerciseId, mediaId);
    if (media.status !== ExerciseMediaStatus.READY) {
      throw new ConflictException('Media is not ready');
    }

    try {
      return await this.storage.createReadUrl(
        media.storageKey,
        this.config.getOrThrow('EXERCISE_MEDIA_READ_TTL_SECONDS', {
          infer: true,
        }),
      );
    } catch (error) {
      this.rethrowStorage(error);
    }
  }

  async remove(
    exerciseId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.exercises.requireExerciseMutationAccess(exerciseId, actor);
    const media = await this.requireMediaOnExercise(exerciseId, mediaId);

    try {
      await this.storage.deleteObject(media.storageKey);
    } catch (error) {
      this.rethrowStorage(error);
    }

    try {
      await this.media.delete(media.id);
    } catch {
      this.logger.error(
        JSON.stringify({
          event: 'exercise_media_metadata_delete_failed',
          mediaId: media.id,
          exerciseId,
        }),
      );
      throw new InternalServerErrorException('Unable to delete media metadata');
    }

    this.logger.log(
      JSON.stringify({
        event: 'exercise_media_deleted',
        mediaId: media.id,
        exerciseId,
      }),
    );
  }

  private async assertCanReadMedia(
    exerciseId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.TRAINER) {
      await this.exercises.requireExerciseById(exerciseId);
      return;
    }

    if (actor.role !== UserRole.CLIENT) {
      throw new NotFoundException('Media not found');
    }

    const allowed = await this.clientMayViewExercise(actor.id, exerciseId);
    if (!allowed) {
      throw new NotFoundException('Media not found');
    }
  }

  private async clientMayViewExercise(
    userId: string,
    exerciseId: string,
  ): Promise<boolean> {
    const onSession = await this.sessionExercises
      .createQueryBuilder('item')
      .innerJoin('item.session', 'session')
      .innerJoin(ClientProfile, 'client', 'client.id = session.clientProfileId')
      .where('client.userId = :userId', { userId })
      .andWhere('item.exerciseId = :exerciseId', { exerciseId })
      .getExists();
    if (onSession) {
      return true;
    }

    return this.planExercises
      .createQueryBuilder('item')
      .innerJoin('item.workout', 'workout')
      .innerJoin('workout.trainingPlan', 'plan')
      .innerJoin(ClientProfile, 'client', 'client.id = plan.clientProfileId')
      .where('client.userId = :userId', { userId })
      .andWhere('item.exerciseId = :exerciseId', { exerciseId })
      .getExists();
  }

  private async requireMediaOnExercise(
    exerciseId: string,
    mediaId: string,
  ): Promise<ExerciseMedia> {
    const media = await this.media.findOne({
      where: { id: mediaId, exerciseId },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  private async headOrThrow(key: string): Promise<StoredObjectMetadata | null> {
    try {
      return await this.storage.headObject(key);
    } catch (error) {
      this.rethrowStorage(error);
    }
  }

  private assertObjectMatches(
    media: ExerciseMedia,
    object: StoredObjectMetadata | null,
  ): asserts object is StoredObjectMetadata {
    if (!object) {
      throw new ConflictException('Uploaded object was not found');
    }

    const reportedType = object.contentType
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    if (!reportedType || reportedType !== media.mimeType) {
      throw new BadRequestException('Object content type is not allowed');
    }

    const maxBytes = this.maxBytesFor(media.mediaType);
    if (object.contentLength < 1 || object.contentLength > maxBytes) {
      throw new PayloadTooLargeException('File exceeds the allowed size');
    }
  }

  private async markFailedAndCleanup(media: ExerciseMedia): Promise<void> {
    media.status = ExerciseMediaStatus.FAILED;
    await this.media.save(media);
    try {
      await this.storage.deleteObject(media.storageKey);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'exercise_media_cleanup_failed',
          mediaId: media.id,
          exerciseId: media.exerciseId,
        }),
      );
      if (!(error instanceof ObjectStorageUnavailableException)) {
        throw error;
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'exercise_media_verification_failed',
        mediaId: media.id,
        exerciseId: media.exerciseId,
      }),
    );
  }

  private maxBytesFor(mediaType: ExerciseMediaType): number {
    return mediaType === ExerciseMediaType.VIDEO
      ? this.config.getOrThrow('EXERCISE_VIDEO_MAX_BYTES', { infer: true })
      : this.config.getOrThrow('EXERCISE_IMAGE_MAX_BYTES', { infer: true });
  }

  private rethrowStorage(error: unknown): never {
    if (error instanceof ObjectStorageUnavailableException) {
      throw new InternalServerErrorException('Object storage is unavailable');
    }
    throw error;
  }
}
