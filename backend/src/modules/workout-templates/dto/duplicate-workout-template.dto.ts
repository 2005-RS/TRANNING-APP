import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  WORKOUT_TEMPLATE_NAME_MAX_LENGTH,
  WORKOUT_TEMPLATE_NAME_MIN_LENGTH,
} from '../workout-templates.constants';
import { normalizeTemplateName } from '../workout-template-text.util';

export class DuplicateWorkoutTemplateDto {
  @ApiPropertyOptional({
    description:
      'Name for the copy. Defaults to the source name followed by " (copy)".',
    example: 'Push Day (copy)',
    minLength: WORKOUT_TEMPLATE_NAME_MIN_LENGTH,
    maxLength: WORKOUT_TEMPLATE_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeTemplateName(value) : value,
  )
  @IsString()
  @MinLength(WORKOUT_TEMPLATE_NAME_MIN_LENGTH)
  @MaxLength(WORKOUT_TEMPLATE_NAME_MAX_LENGTH)
  name?: string;
}
