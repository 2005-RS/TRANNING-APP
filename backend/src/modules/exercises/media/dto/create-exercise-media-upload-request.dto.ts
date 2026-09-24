import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ExerciseMediaType } from '../enums/exercise-media-type.enum';
import {
  EXERCISE_MEDIA_DISPLAY_ORDER_MAX,
  EXERCISE_MEDIA_DISPLAY_ORDER_MIN,
  EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH,
} from '../exercise-media.constants';

export class CreateExerciseMediaUploadRequestDto {
  @ApiProperty({ enum: ExerciseMediaType })
  @IsEnum(ExerciseMediaType)
  mediaType!: ExerciseMediaType;

  @ApiProperty({
    example: 'bench-press.mp4',
    maxLength: EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(EXERCISE_MEDIA_ORIGINAL_FILENAME_MAX_LENGTH)
  fileName!: string;

  @ApiProperty({
    example: 'video/mp4',
    description:
      'Must match an allowlisted type for mediaType. VIDEO: video/mp4, video/webm, video/quicktime. IMAGE: image/jpeg, image/png, image/webp. SVG, HTML, JavaScript, and application/octet-stream are rejected.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: 12_345_678 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @ApiPropertyOptional({
    default: 0,
    minimum: EXERCISE_MEDIA_DISPLAY_ORDER_MIN,
    maximum: EXERCISE_MEDIA_DISPLAY_ORDER_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(EXERCISE_MEDIA_DISPLAY_ORDER_MIN)
  @Max(EXERCISE_MEDIA_DISPLAY_ORDER_MAX)
  displayOrder?: number;
}
