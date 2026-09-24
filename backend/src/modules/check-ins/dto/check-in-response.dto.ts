import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInStatus } from '../enums/check-in-status.enum';

export class CheckInResponsesDto {
  @ApiPropertyOptional({ nullable: true, type: Number })
  sleepQuality!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  energyLevel!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  stressLevel!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  hungerLevel!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  recoveryLevel!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  trainingAdherencePct!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  nutritionAdherencePct!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  wins!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  challenges!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  generalNotes!: string | null;
}

export class CheckInReviewResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  feedback!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  actionItems!: string | null;

  @ApiProperty({
    description:
      'User id of the Trainer who wrote the review. Provenance only; it does not grant later access after reassignment.',
  })
  reviewedByUserId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CheckInResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '2026-08-24' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-30' })
  periodEnd!: string;

  @ApiProperty({ enum: CheckInStatus })
  status!: CheckInStatus;

  @ApiProperty({ type: CheckInResponsesDto })
  responses!: CheckInResponsesDto;

  @ApiPropertyOptional({ nullable: true, type: Date })
  submittedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: CheckInReviewResponseDto })
  review!: CheckInReviewResponseDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CheckInSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '2026-08-24' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-30' })
  periodEnd!: string;

  @ApiProperty({ enum: CheckInStatus })
  status!: CheckInStatus;

  @ApiPropertyOptional({ nullable: true, type: Date })
  submittedAt!: Date | null;

  @ApiProperty({
    description:
      'True when status is REVIEWED. Review insert and status update are one transaction.',
  })
  hasReview!: boolean;

  @ApiProperty()
  createdAt!: Date;
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

export class PaginatedCheckInsResponseDto {
  @ApiProperty({ type: [CheckInSummaryResponseDto] })
  data!: CheckInSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
