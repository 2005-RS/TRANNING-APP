import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BodyMeasurementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  measuredAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bodyWeightKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bodyFatPercentage!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  neckCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  shouldersCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  chestCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  waistCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  hipsCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  leftArmCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  rightArmCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  leftThighCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  rightThighCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  leftCalfCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  rightCalfCm!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;

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

export class PaginatedBodyMeasurementsResponseDto {
  @ApiProperty({ type: [BodyMeasurementResponseDto] })
  data!: BodyMeasurementResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
