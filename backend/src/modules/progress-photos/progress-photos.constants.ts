export const PROGRESS_PHOTO_LIST_DEFAULT_PAGE = 1;
export const PROGRESS_PHOTO_LIST_DEFAULT_LIMIT = 20;
export const PROGRESS_PHOTO_LIST_MAX_LIMIT = 100;
export const PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH = 255;
export const PROGRESS_PHOTO_FUTURE_SKEW_MS = 5 * 60 * 1000;

export const PROGRESS_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PROGRESS_PHOTO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const DEFAULT_PROGRESS_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
