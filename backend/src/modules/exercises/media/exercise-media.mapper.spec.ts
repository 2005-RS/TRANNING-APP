import { ExerciseMediaStatus } from './enums/exercise-media-status.enum';
import { ExerciseMediaType } from './enums/exercise-media-type.enum';
import { ExerciseMedia } from './entities/exercise-media.entity';
import { toExerciseMediaResponse } from './exercise-media.mapper';

describe('toExerciseMediaResponse', () => {
  it('returns safe metadata and omits storage internals', () => {
    const mapped = toExerciseMediaResponse({
      id: 'media-1',
      exerciseId: 'ex-1',
      mediaType: ExerciseMediaType.VIDEO,
      storageKey: 'exercises/ex-1/media-1/secret.mp4',
      originalFileName: 'bench.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 2048,
      status: ExerciseMediaStatus.READY,
      displayOrder: 0,
      createdByUserId: 'user-1',
      finalizedAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as ExerciseMedia);

    expect(mapped.id).toBe('media-1');
    expect(mapped.status).toBe(ExerciseMediaStatus.READY);
    expect(mapped).not.toHaveProperty('storageKey');
    expect(mapped).not.toHaveProperty('createdByUserId');
    expect(mapped).not.toHaveProperty('exerciseId');
    expect(JSON.stringify(mapped)).not.toContain('secret.mp4');
  });
});
