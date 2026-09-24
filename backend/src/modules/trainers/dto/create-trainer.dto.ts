import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/auth.constants';
import {
  TRAINER_BIO_MAX_LENGTH,
  TRAINER_PHONE_MAX_LENGTH,
  TRAINER_TITLE_MAX_LENGTH,
} from '../trainers.constants';

export class CreateTrainerDto {
  @ApiProperty({ example: 'trainer@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ maxLength: TRAINER_PHONE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_PHONE_MAX_LENGTH)
  @Matches(/^[\d+\-\s().]*$/, {
    message: 'phone must contain only digits and common phone punctuation',
  })
  phone?: string;

  @ApiPropertyOptional({ maxLength: TRAINER_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_TITLE_MAX_LENGTH)
  professionalTitle?: string;

  @ApiPropertyOptional({ maxLength: TRAINER_BIO_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_BIO_MAX_LENGTH)
  bio?: string;
}
