import { ExerciseMediaResponseDto } from './dto/exercise-media-response.dto';
import { ExerciseMedia } from './entities/exercise-media.entity';

export function toExerciseMediaResponse(
  media: ExerciseMedia,
): ExerciseMediaResponseDto {
  return {
    id: media.id,
    mediaType: media.mediaType,
    originalFileName: media.originalFileName,
    mimeType: media.mimeType,
    fileSizeBytes: media.fileSizeBytes,
    status: media.status,
    displayOrder: media.displayOrder,
    createdAt: media.createdAt,
    finalizedAt: media.finalizedAt,
  };
}
