import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  WORKOUT_TEMPLATE_DESCRIPTION_MAX_LENGTH,
  WORKOUT_TEMPLATE_NAME_MAX_LENGTH,
  WORKOUT_TEMPLATE_NAME_MIN_LENGTH,
} from '../workout-templates.constants';
import { normalizeTemplateName } from '../workout-template-text.util';

export class UpdateWorkoutTemplateDto {
  @ApiPropertyOptional({
    example: 'Push Day',
    minLength: WORKOUT_TEMPLATE_NAME_MIN_LENGTH,
    maxLength: WORKOUT_TEMPLATE_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeTemplateName(value) : value,
  )
  @IsString()
  @MinLength(WORKOUT_TEMPLATE_NAME_MIN_LENGTH)
  @MaxLength(WORKOUT_TEMPLATE_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: WORKOUT_TEMPLATE_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKOUT_TEMPLATE_DESCRIPTION_MAX_LENGTH)
  description?: string | null;
}
