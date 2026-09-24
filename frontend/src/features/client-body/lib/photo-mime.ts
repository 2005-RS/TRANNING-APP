export const PROGRESS_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ProgressPhotoMimeType = (typeof PROGRESS_PHOTO_MIME_TYPES)[number];

/** UX ceiling matching backend default PROGRESS_PHOTO_MAX_BYTES. API remains authority. */
export const PROGRESS_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedProgressPhotoMime(
  mimeType: string,
): mimeType is ProgressPhotoMimeType {
  return (PROGRESS_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType);
}
