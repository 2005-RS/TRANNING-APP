import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/auth.constants';
import { ClientExperienceLevel } from '../../clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../../clients/enums/client-primary-goal.enum';

export class RegisterDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ enum: ClientPrimaryGoal })
  @IsEnum(ClientPrimaryGoal)
  primaryGoal!: ClientPrimaryGoal;

  @ApiProperty({ enum: ClientExperienceLevel })
  @IsEnum(ClientExperienceLevel)
  experienceLevel!: ClientExperienceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goalNotes?: string;

  @ApiProperty({ enum: [true] })
  @IsBoolean()
  acceptTerms!: true;
}
