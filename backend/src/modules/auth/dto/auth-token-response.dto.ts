import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class AuthUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Access token lifetime in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
