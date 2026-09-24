import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  TRAINER_BIO_MAX_LENGTH,
  TRAINER_PHONE_MAX_LENGTH,
  TRAINER_TITLE_MAX_LENGTH,
} from '../trainers.constants';

export class TrainerSelfUpdateDto {
  @ApiPropertyOptional({ maxLength: TRAINER_PHONE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_PHONE_MAX_LENGTH)
  @Matches(/^[\d+\-\s().]*$/, {
    message: 'phone must contain only digits and common phone punctuation',
  })
  phone?: string | null;

  @ApiPropertyOptional({ maxLength: TRAINER_TITLE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_TITLE_MAX_LENGTH)
  professionalTitle?: string | null;

  @ApiPropertyOptional({ maxLength: TRAINER_BIO_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_BIO_MAX_LENGTH)
  bio?: string | null;
}
