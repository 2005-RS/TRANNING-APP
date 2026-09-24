import { ProgressPhotoResponseDto } from './dto/progress-photo-response.dto';
import { ProgressPhoto } from './entities/progress-photo.entity';

export function toProgressPhotoResponse(
  photo: ProgressPhoto,
): ProgressPhotoResponseDto {
  return {
    id: photo.id,
    pose: photo.pose,
    status: photo.status,
    mimeType: photo.mimeType,
    fileSizeBytes:
      photo.fileSizeBytes === null ? null : Number(photo.fileSizeBytes),
    capturedAt: photo.capturedAt,
    bodyMeasurementId: photo.bodyMeasurementId,
    finalizedAt: photo.finalizedAt,
    createdAt: photo.createdAt,
  };
}

export function paginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): { page: number; limit: number; totalItems: number; totalPages: number } {
  return {
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
}
