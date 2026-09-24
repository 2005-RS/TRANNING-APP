import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import {
  CHECK_IN_LIST_DEFAULT_LIMIT,
  CHECK_IN_LIST_DEFAULT_PAGE,
  CHECK_IN_LIST_MAX_LIMIT,
} from '../check-ins.constants';
import { CheckInStatus } from '../enums/check-in-status.enum';

export class ListClientCheckInsQueryDto {
  @ApiPropertyOptional({
    default: CHECK_IN_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CHECK_IN_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: CHECK_IN_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: CHECK_IN_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CHECK_IN_LIST_MAX_LIMIT)
  limit: number = CHECK_IN_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: CheckInStatus })
  @IsOptional()
  @IsEnum(CheckInStatus)
  status?: CheckInStatus;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description:
      'Inclusive lower bound on periodStart (YYYY-MM-DD). Filters the period start date, not overlap.',
  })
  @IsOptional()
  @IsStrictIsoDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description:
      'Inclusive upper bound on periodStart (YYYY-MM-DD). dateTo < dateFrom is 400.',
  })
  @ValidateIf(
    (dto: ListClientCheckInsQueryDto) =>
      dto.dateTo !== undefined && dto.dateTo !== null,
  )
  @IsStrictIsoDate()
  dateTo?: string;
}
