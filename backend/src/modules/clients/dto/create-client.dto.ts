import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
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
  CLIENT_GOAL_NOTES_MAX_LENGTH,
  CLIENT_PHONE_MAX_LENGTH,
} from '../clients.constants';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';
import { IsNotFutureIsoDate, IsStrictIsoDate } from '../iso-date.validators';

export class CreateClientDto {
  @ApiProperty({ example: 'client@example.com' })
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

  @ApiPropertyOptional({ maxLength: CLIENT_PHONE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_PHONE_MAX_LENGTH)
  @Matches(/^[\d+\-\s().]*$/, {
    message: 'phone must contain only digits and common phone punctuation',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '1994-06-15' })
  @IsOptional()
  @IsStrictIsoDate()
  @IsNotFutureIsoDate()
  dateOfBirth?: string;

  @ApiProperty({ enum: ClientPrimaryGoal })
  @IsEnum(ClientPrimaryGoal)
  primaryGoal!: ClientPrimaryGoal;

  @ApiPropertyOptional({ maxLength: CLIENT_GOAL_NOTES_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_GOAL_NOTES_MAX_LENGTH)
  goalNotes?: string;

  @ApiProperty({ enum: ClientExperienceLevel })
  @IsEnum(ClientExperienceLevel)
  experienceLevel!: ClientExperienceLevel;
}
