import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import {
  CHECK_IN_ACTION_ITEMS_MAX_LENGTH,
  CHECK_IN_FEEDBACK_MAX_LENGTH,
} from '../check-ins.constants';

export class UpdateCheckInReviewDto {
  @ApiPropertyOptional({
    maxLength: CHECK_IN_FEEDBACK_MAX_LENGTH,
    description:
      'Replacement plain-text feedback. Must remain non-whitespace if provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CHECK_IN_FEEDBACK_MAX_LENGTH)
  feedback?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: CHECK_IN_ACTION_ITEMS_MAX_LENGTH,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(CHECK_IN_ACTION_ITEMS_MAX_LENGTH)
  actionItems?: string | null;
}
