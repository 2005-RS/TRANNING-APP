import { ExerciseMediaType } from './enums/exercise-media-type.enum';

export const EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH = 255;
export const EXERCISE_MEDIA_DISPLAY_ORDER_MIN = 0;
export const EXERCISE_MEDIA_DISPLAY_ORDER_MAX = 1_000;
export const EXERCISE_MEDIA_MAX_VIDEOS = 5;
export const EXERCISE_MEDIA_MAX_IMAGES = 10;

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

export const EXERCISE_MEDIA_EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function allowedMimeTypesFor(
  mediaType: ExerciseMediaType,
): readonly string[] {
  return mediaType === ExerciseMediaType.VIDEO
    ? EXERCISE_VIDEO_MIME_TYPES
    : EXERCISE_IMAGE_MIME_TYPES;
}

export function mediaCountLimit(mediaType: ExerciseMediaType): number {
  return mediaType === ExerciseMediaType.VIDEO
    ? EXERCISE_MEDIA_MAX_VIDEOS
    : EXERCISE_MEDIA_MAX_IMAGES;
}
