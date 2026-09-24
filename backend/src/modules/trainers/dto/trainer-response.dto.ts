import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

export class TrainerUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TRAINER })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;
}

export class TrainerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: TrainerUserResponseDto })
  user!: TrainerUserResponseDto;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  professionalTitle!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  bio!: string | null;

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

export class PaginatedTrainersResponseDto {
  @ApiProperty({ type: [TrainerResponseDto] })
  data!: TrainerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
