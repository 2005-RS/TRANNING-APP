import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CLIENT_GOAL_NOTES_MAX_LENGTH,
  CLIENT_PHONE_MAX_LENGTH,
} from '../clients.constants';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';

export class ClientSelfUpdateDto {
  @ApiPropertyOptional({ maxLength: CLIENT_PHONE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_PHONE_MAX_LENGTH)
  @Matches(/^[\d+\-\s().]*$/, {
    message: 'phone must contain only digits and common phone punctuation',
  })
  phone?: string | null;

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
