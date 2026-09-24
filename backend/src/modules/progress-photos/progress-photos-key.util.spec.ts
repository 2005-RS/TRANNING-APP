import {
  buildProgressPhotoStorageKey,
  isAllowedProgressPhotoMime,
  sanitizeOriginalFileName,
} from './progress-photos-key.util';
import { toProgressPhotoResponse } from './progress-photos.mapper';
import { ProgressPhoto } from './entities/progress-photo.entity';
import { ProgressPhotoPose } from './enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from './enums/progress-photo-status.enum';

describe('progress photo key helpers and mapper', () => {
  it('sanitizes original filenames without using them in storage keys', () => {
    expect(sanitizeOriginalFileName('../../etc/passwd.jpg')).toBe('passwd.jpg');
    expect(sanitizeOriginalFileName('C:\\windows\\front.jpg')).toBe(
      'front.jpg',
    );
  });

  it('allowlists raster MIME types only', () => {
    expect(isAllowedProgressPhotoMime('image/jpeg')).toBe(true);
    expect(isAllowedProgressPhotoMime('image/png')).toBe(true);
    expect(isAllowedProgressPhotoMime('image/webp')).toBe(true);
    expect(isAllowedProgressPhotoMime('image/svg+xml')).toBe(false);
    expect(isAllowedProgressPhotoMime('image/gif')).toBe(false);
    expect(isAllowedProgressPhotoMime('text/html')).toBe(false);
  });

  it('builds keys under progress-photos without PII', () => {
    const clientId = '11111111-1111-4111-8111-111111111111';
    const photoId = '22222222-2222-4222-8222-222222222222';
    const key = buildProgressPhotoStorageKey(clientId, photoId, 'image/jpeg');
    expect(key).toMatch(
      new RegExp(
        `^progress-photos/${clientId}/${photoId}/[0-9a-f-]{36}\\.jpg$`,
      ),
    );
    expect(key).not.toContain('@');
    expect(key).not.toContain('front.jpg');
    expect(key).not.toContain('Cara');
  });

  it('omits storageKey and originalFileName from API responses', () => {
    const mapped = toProgressPhotoResponse({
      id: 'p-1',
      clientProfileId: 'c-1',
      bodyMeasurementId: 'm-1',
      pose: ProgressPhotoPose.FRONT,
      status: ProgressPhotoStatus.READY,
      storageKey: 'progress-photos/c-1/p-1/file.jpg',
      originalFileName: 'front.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 2481900,
      capturedAt: new Date('2026-08-01T12:00:00.000Z'),
      finalizedAt: new Date('2026-08-01T12:01:00.000Z'),
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
      updatedAt: new Date('2026-08-01T12:01:00.000Z'),
    } as ProgressPhoto);

    expect(mapped).not.toHaveProperty('storageKey');
    expect(mapped).not.toHaveProperty('originalFileName');
    expect(mapped.fileSizeBytes).toBe(2481900);
    expect(mapped.bodyMeasurementId).toBe('m-1');
  });
});
