import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CLIENT_GOAL_NOTES_MAX_LENGTH,
  CLIENT_PHONE_MAX_LENGTH,
} from '../clients.constants';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';
import { IsNotFutureIsoDate, IsStrictIsoDate } from '../iso-date.validators';

export class AdminUpdateClientDto {
  @ApiPropertyOptional({ example: 'client@example.com' })
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ maxLength: CLIENT_PHONE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_PHONE_MAX_LENGTH)
  @Matches(/^[\d+\-\s().]*$/, {
    message: 'phone must contain only digits and common phone punctuation',
  })
  phone?: string | null;

  @ApiPropertyOptional({ example: '1994-06-15', nullable: true })
  @IsOptional()
  @IsStrictIsoDate()
  @IsNotFutureIsoDate()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: ClientPrimaryGoal })
  @IsOptional()
  @IsEnum(ClientPrimaryGoal)
  primaryGoal?: ClientPrimaryGoal;

  @ApiPropertyOptional({
    maxLength: CLIENT_GOAL_NOTES_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_GOAL_NOTES_MAX_LENGTH)
  goalNotes?: string | null;

  @ApiPropertyOptional({ enum: ClientExperienceLevel })
  @IsOptional()
  @IsEnum(ClientExperienceLevel)
  experienceLevel?: ClientExperienceLevel;
}
