import { randomUUID } from 'node:crypto';
import {
  EXERCISE_MEDIA_EXTENSION_BY_MIME,
  EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH,
  allowedMimeTypesFor,
} from './exercise-media.constants';
import { ExerciseMediaType } from './enums/exercise-media-type.enum';

export function sanitizeOriginalFileName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  const base = normalized.split('/').pop()?.trim() ?? '';
  const cleaned = Array.from(base)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');
  return cleaned.slice(0, EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH);
}

export function extensionForMime(mimeType: string): string {
  const extension = EXERCISE_MEDIA_EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  return extension;
}

export function isAllowedMime(
  mediaType: ExerciseMediaType,
  mimeType: string,
): boolean {
  return allowedMimeTypesFor(mediaType).includes(mimeType);
}

export function buildStorageKey(
  exerciseId: string,
  mediaId: string,
  mimeType: string,
): string {
  return `exercises/${exerciseId}/${mediaId}/${randomUUID()}.${extensionForMime(mimeType)}`;
}
