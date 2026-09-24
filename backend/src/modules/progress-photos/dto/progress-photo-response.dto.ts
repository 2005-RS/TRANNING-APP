import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressPhotoPose } from '../enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from '../enums/progress-photo-status.enum';

export class ProgressPhotoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ProgressPhotoPose })
  pose!: ProgressPhotoPose;

  @ApiProperty({ enum: ProgressPhotoStatus })
  status!: ProgressPhotoStatus;

  @ApiProperty()
  mimeType!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fileSizeBytes!: number | null;

  @ApiProperty()
  capturedAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'uuid' })
  bodyMeasurementId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  finalizedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SignedUploadInstructionsDto {
  @ApiProperty({ example: 'POST' })
  method!: 'POST';

  @ApiProperty()
  url!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields!: Record<string, string>;

  @ApiProperty()
  expiresAt!: Date;
}

export class ProgressPhotoUploadRequestResponseDto {
  @ApiProperty({ type: ProgressPhotoResponseDto })
  photo!: ProgressPhotoResponseDto;

  @ApiProperty({ type: SignedUploadInstructionsDto })
  upload!: SignedUploadInstructionsDto;
}

export class ProgressPhotoAccessResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedProgressPhotosResponseDto {
  @ApiProperty({ type: [ProgressPhotoResponseDto] })
  data!: ProgressPhotoResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
