import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_TOKEN_MAX_LENGTH,
} from '../auth.constants';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Single-use token from the reset link.',
    maxLength: PASSWORD_RESET_TOKEN_MAX_LENGTH,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_RESET_TOKEN_MAX_LENGTH)
  token!: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
