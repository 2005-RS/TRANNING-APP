import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseMediaStatus } from '../enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../enums/exercise-media-type.enum';

export class ExerciseMediaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ExerciseMediaType })
  mediaType!: ExerciseMediaType;

  @ApiPropertyOptional({ nullable: true, type: String })
  originalFileName!: string | null;

  @ApiProperty()
  mimeType!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fileSizeBytes!: number | null;

  @ApiProperty({ enum: ExerciseMediaStatus })
  status!: ExerciseMediaStatus;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: Date })
  finalizedAt!: Date | null;
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

export class ExerciseMediaUploadRequestResponseDto {
  @ApiProperty({ type: ExerciseMediaResponseDto })
  media!: ExerciseMediaResponseDto;

  @ApiProperty({ type: SignedUploadInstructionsDto })
  upload!: SignedUploadInstructionsDto;
}

export class ExerciseMediaAccessResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: Date;
}
