import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { IsStrictIsoDateTime } from '../../body-measurements/iso-datetime.validators';
import { ProgressPhotoPose } from '../enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from '../enums/progress-photo-status.enum';
import {
  PROGRESS_PHOTO_LIST_DEFAULT_LIMIT,
  PROGRESS_PHOTO_LIST_DEFAULT_PAGE,
  PROGRESS_PHOTO_LIST_MAX_LIMIT,
  PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
} from '../progress-photos.constants';

export class CreateProgressPhotoUploadRequestDto {
  @ApiProperty({
    example: 'front.jpg',
    maxLength: PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
    description:
      'Untrusted display metadata only. Never used for object keys, MIME inference, authorization, or filesystem paths.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PROGRESS_PHOTO_ORIGINAL_FILENAME_MAX_LENGTH)
  originalFileName!: string;

  @ApiProperty({
    example: 'image/jpeg',
    description:
      'Allowlisted raster types only: image/jpeg, image/png, image/webp. SVG, GIF, HTML, and executable types are rejected.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: 2_500_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @ApiProperty({ enum: ProgressPhotoPose })
  @IsEnum(ProgressPhotoPose)
  pose!: ProgressPhotoPose;

  @ApiPropertyOptional({
    example: '2026-08-01T12:00:00.000Z',
    description:
      'When the photo was captured. ISO-8601 with timezone. Omitted values default to server UTC now. EXIF is not parsed.',
  })
  @IsOptional()
  @IsStrictIsoDateTime()
  capturedAt?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional BodyMeasurement owned by the same Client. Foreign measurement IDs return 404.',
  })
  @IsOptional()
  @IsUUID('4')
  bodyMeasurementId?: string;
}

export class ListProgressPhotosQueryDto {
  @ApiPropertyOptional({
    default: PROGRESS_PHOTO_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PROGRESS_PHOTO_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PROGRESS_PHOTO_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PROGRESS_PHOTO_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROGRESS_PHOTO_LIST_MAX_LIMIT)
  limit: number = PROGRESS_PHOTO_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ProgressPhotoPose })
  @IsOptional()
  @IsEnum(ProgressPhotoPose)
  pose?: ProgressPhotoPose;

  @ApiPropertyOptional({
    enum: ProgressPhotoStatus,
    description:
      'Owner-only. Defaults to READY. CLIENT may pass PENDING_UPLOAD or FAILED to inspect upload status. Management lists are always READY.',
  })
  @IsOptional()
  @IsEnum(ProgressPhotoStatus)
  status?: ProgressPhotoStatus;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description:
      'Inclusive UTC calendar day lower bound on capturedAt (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsStrictIsoDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description:
      'Inclusive UTC calendar day upper bound on capturedAt (YYYY-MM-DD).',
  })
  @ValidateIf(
    (dto: ListProgressPhotosQueryDto) =>
      dto.dateTo !== undefined && dto.dateTo !== null,
  )
  @IsStrictIsoDate()
  dateTo?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  bodyMeasurementId?: string;
}
