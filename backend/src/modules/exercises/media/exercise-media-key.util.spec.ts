import {
  buildStorageKey,
  extensionForMime,
  isAllowedMime,
  sanitizeOriginalFileName,
} from './exercise-media-key.util';
import { ExerciseMediaType } from './enums/exercise-media-type.enum';

describe('exercise media key helpers', () => {
  it('keeps original filenames as display metadata and strips path segments', () => {
    expect(sanitizeOriginalFileName('../../etc/passwd.mp4')).toBe('passwd.mp4');
    expect(sanitizeOriginalFileName('C:\\windows\\evil.mp4')).toBe('evil.mp4');
    expect(sanitizeOriginalFileName('  bench press.mp4  ')).toBe(
      'bench press.mp4',
    );
  });

  it('maps extensions from the allowlisted MIME type, not the user filename', () => {
    expect(extensionForMime('video/mp4')).toBe('mp4');
    expect(extensionForMime('video/quicktime')).toBe('mov');
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(() => extensionForMime('application/octet-stream')).toThrow(
      /Unsupported MIME type/,
    );
  });

  it('allowlists video and image MIME types only', () => {
    expect(isAllowedMime(ExerciseMediaType.VIDEO, 'video/mp4')).toBe(true);
    expect(isAllowedMime(ExerciseMediaType.VIDEO, 'image/jpeg')).toBe(false);
    expect(isAllowedMime(ExerciseMediaType.IMAGE, 'image/svg+xml')).toBe(false);
    expect(
      isAllowedMime(ExerciseMediaType.IMAGE, 'application/octet-stream'),
    ).toBe(false);
  });

  it('builds distinct keys under the exercise namespace', () => {
    const exerciseId = '11111111-1111-4111-8111-111111111111';
    const mediaId = '22222222-2222-4222-8222-222222222222';
    const first = buildStorageKey(exerciseId, mediaId, 'video/mp4');
    const second = buildStorageKey(exerciseId, mediaId, 'video/mp4');

    expect(first).toMatch(
      new RegExp(`^exercises/${exerciseId}/${mediaId}/[0-9a-f-]{36}\\.mp4$`),
    );
    expect(second).not.toBe(first);
    expect(first).not.toContain('bench');
  });
});
