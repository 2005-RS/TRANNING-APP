import {
  CreateExerciseMediaUploadRequestDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  ExerciseResponseDtoStatus,
  type ExerciseMediaResponseDto,
  type ExerciseResponseDto,
} from '@/generated/models';

export const EXERCISE_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const EXERCISE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const EXERCISE_MEDIA_ACCEPT = [
  ...EXERCISE_VIDEO_MIME_TYPES,
  ...EXERCISE_IMAGE_MIME_TYPES,
].join(',');

/** UX ceiling matching backend default EXERCISE_VIDEO_MAX_BYTES. API remains authority. */
export const EXERCISE_VIDEO_MAX_BYTES = 250 * 1024 * 1024;
/** UX ceiling matching backend default EXERCISE_IMAGE_MAX_BYTES. API remains authority. */
export const EXERCISE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const EXERCISE_MEDIA_MAX_VIDEOS = 5;
export const EXERCISE_MEDIA_MAX_IMAGES = 10;

export type ExerciseMediaKind = CreateExerciseMediaUploadRequestDtoMediaType;

export function mediaTypeForMime(mimeType: string): ExerciseMediaKind | null {
  const mime = mimeType.trim().toLowerCase();
  if ((EXERCISE_VIDEO_MIME_TYPES as readonly string[]).includes(mime)) {
    return CreateExerciseMediaUploadRequestDtoMediaType.VIDEO;
  }
  if ((EXERCISE_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return CreateExerciseMediaUploadRequestDtoMediaType.IMAGE;
  }
  return null;
}

export function maxBytesForMediaType(mediaType: ExerciseMediaKind): number {
  return mediaType === CreateExerciseMediaUploadRequestDtoMediaType.VIDEO
    ? EXERCISE_VIDEO_MAX_BYTES
    : EXERCISE_IMAGE_MAX_BYTES;
}

export function mediaCountLimit(mediaType: ExerciseMediaKind): number {
  return mediaType === CreateExerciseMediaUploadRequestDtoMediaType.VIDEO
    ? EXERCISE_MEDIA_MAX_VIDEOS
    : EXERCISE_MEDIA_MAX_IMAGES;
}

export function occupiedMediaCount(
  items: ExerciseMediaResponseDto[],
  mediaType: ExerciseMediaKind,
): number {
  return items.filter(
    (item) =>
      item.mediaType === mediaType &&
      (item.status === ExerciseMediaResponseDtoStatus.READY ||
        item.status === ExerciseMediaResponseDtoStatus.PENDING_UPLOAD),
  ).length;
}

export function canManageExerciseMedia(
  exercise: Pick<ExerciseResponseDto, 'createdByUserId'>,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId) && exercise.createdByUserId === userId;
}

export function canUploadExerciseMedia(
  exercise: Pick<ExerciseResponseDto, 'createdByUserId' | 'status'>,
  userId: string | null | undefined,
): boolean {
  return canManageExerciseMedia(exercise, userId) && exercise.status === ExerciseResponseDtoStatus.ACTIVE;
}
