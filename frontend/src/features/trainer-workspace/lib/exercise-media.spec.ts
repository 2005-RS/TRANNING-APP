import { describe, expect, it } from 'vitest';
import {
  CreateExerciseMediaUploadRequestDtoMediaType,
  ExerciseMediaResponseDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  ExerciseResponseDtoStatus,
} from '@/generated/models';
import {
  canManageExerciseMedia,
  canUploadExerciseMedia,
  mediaTypeForMime,
  occupiedMediaCount,
} from '@/features/trainer-workspace/lib/exercise-media';

const trainerId = '33333333-3333-4333-8333-333333333333';
const adminId = '44444444-4444-4444-8444-444444444444';

describe('exercise media helpers', () => {
  it('maps allowlisted MIME types and rejects GIF', () => {
    expect(mediaTypeForMime('video/mp4')).toBe(CreateExerciseMediaUploadRequestDtoMediaType.VIDEO);
    expect(mediaTypeForMime('video/webm')).toBe(CreateExerciseMediaUploadRequestDtoMediaType.VIDEO);
    expect(mediaTypeForMime('video/quicktime')).toBe(CreateExerciseMediaUploadRequestDtoMediaType.VIDEO);
    expect(mediaTypeForMime('image/jpeg')).toBe(CreateExerciseMediaUploadRequestDtoMediaType.IMAGE);
    expect(mediaTypeForMime('image/gif')).toBeNull();
    expect(mediaTypeForMime('application/octet-stream')).toBeNull();
  });

  it('lets the owning trainer mutate media and blocks catalog owners', () => {
    expect(canManageExerciseMedia({ createdByUserId: trainerId }, trainerId)).toBe(true);
    expect(canManageExerciseMedia({ createdByUserId: adminId }, trainerId)).toBe(false);
    expect(
      canUploadExerciseMedia(
        { createdByUserId: trainerId, status: ExerciseResponseDtoStatus.ACTIVE },
        trainerId,
      ),
    ).toBe(true);
    expect(
      canUploadExerciseMedia(
        { createdByUserId: trainerId, status: ExerciseResponseDtoStatus.ARCHIVED },
        trainerId,
      ),
    ).toBe(false);
  });

  it('counts READY and PENDING_UPLOAD toward the type limit', () => {
    const items = [
      {
        mediaType: ExerciseMediaResponseDtoMediaType.VIDEO,
        status: ExerciseMediaResponseDtoStatus.READY,
      },
      {
        mediaType: ExerciseMediaResponseDtoMediaType.VIDEO,
        status: ExerciseMediaResponseDtoStatus.PENDING_UPLOAD,
      },
      {
        mediaType: ExerciseMediaResponseDtoMediaType.VIDEO,
        status: ExerciseMediaResponseDtoStatus.FAILED,
      },
      {
        mediaType: ExerciseMediaResponseDtoMediaType.IMAGE,
        status: ExerciseMediaResponseDtoStatus.READY,
      },
    ];
    expect(
      occupiedMediaCount(
        items as never,
        CreateExerciseMediaUploadRequestDtoMediaType.VIDEO,
      ),
    ).toBe(2);
  });
});
