import { randomUUID } from 'node:crypto';
import {
  PROGRESS_PHOTO_EXTENSION_BY_MIME,
  PROGRESS_PHOTO_MIME_TYPES,
  PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
} from './progress-photos.constants';

export function sanitizeOriginalFileName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  const base = normalized.split('/').pop()?.trim() ?? '';
  const cleaned = Array.from(base)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');
  return cleaned.slice(0, PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH);
}

export function extensionForMime(mimeType: string): string {
  const extension = PROGRESS_PHOTO_EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  return extension;
}

export function isAllowedProgressPhotoMime(mimeType: string): boolean {
  return (PROGRESS_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function buildProgressPhotoStorageKey(
  clientProfileId: string,
  photoId: string,
  mimeType: string,
): string {
  return `progress-photos/${clientProfileId}/${photoId}/${randomUUID()}.${extensionForMime(mimeType)}`;
}
