import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX_LENGTH } from '../auth.constants';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 1, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
