import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrainerResponseDto } from '../../trainers/dto/trainer-response.dto';

export class CurrentTrainerResponseDto {
  @ApiPropertyOptional({ type: TrainerResponseDto, nullable: true })
  trainer!: TrainerResponseDto | null;
}

export class ClientTrainerAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: TrainerResponseDto })
  trainer!: TrainerResponseDto;

  @ApiProperty()
  assignedAt!: Date;
}

export class AssignmentHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: TrainerResponseDto })
  trainer!: TrainerResponseDto;

  @ApiProperty()
  assignedAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: Date })
  endedAt!: Date | null;

  @ApiProperty()
  assignedByUserId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  endedByUserId!: string | null;
}

export class AssignmentHistoryMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedAssignmentHistoryResponseDto {
  @ApiProperty({ type: [AssignmentHistoryItemDto] })
  data!: AssignmentHistoryItemDto[];

  @ApiProperty({ type: AssignmentHistoryMetaDto })
  meta!: AssignmentHistoryMetaDto;
}
