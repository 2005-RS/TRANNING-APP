import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';

export class ClientUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CLIENT })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;
}

export class ClientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: ClientUserResponseDto })
  user!: ClientUserResponseDto;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '1994-06-15' })
  dateOfBirth!: string | null;

  @ApiProperty({ enum: ClientPrimaryGoal })
  primaryGoal!: ClientPrimaryGoal;

  @ApiPropertyOptional({ nullable: true, type: String })
  goalNotes!: string | null;

  @ApiProperty({ enum: ClientExperienceLevel })
  experienceLevel!: ClientExperienceLevel;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedClientsResponseDto {
  @ApiProperty({ type: [ClientResponseDto] })
  data!: ClientResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
