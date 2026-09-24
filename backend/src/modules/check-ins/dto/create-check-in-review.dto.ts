import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CHECK_IN_ACTION_ITEMS_MAX_LENGTH,
  CHECK_IN_FEEDBACK_MAX_LENGTH,
} from '../check-ins.constants';

export class CreateCheckInReviewDto {
  @ApiProperty({
    maxLength: CHECK_IN_FEEDBACK_MAX_LENGTH,
    description:
      'Required plain-text Trainer feedback. Must contain non-whitespace content. Not medical advice. HTML is not accepted as markup.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(CHECK_IN_FEEDBACK_MAX_LENGTH)
  feedback!: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: CHECK_IN_ACTION_ITEMS_MAX_LENGTH,
    description:
      'Optional plain-text action items. Not parsed into tasks in this version.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CHECK_IN_ACTION_ITEMS_MAX_LENGTH)
  actionItems?: string | null;
}
