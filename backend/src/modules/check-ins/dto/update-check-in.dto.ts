import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { CheckInResponseFieldsDto } from './check-in-response-fields.dto';

export class UpdateCheckInDto extends CheckInResponseFieldsDto {
  @ApiPropertyOptional({
    example: '2026-08-24',
    description: 'Allowed only while the CheckIn is DRAFT.',
  })
  @IsOptional()
  @IsStrictIsoDate()
  periodStart?: string;

  @ApiPropertyOptional({
    example: '2026-08-30',
  })
  @IsOptional()
  @IsStrictIsoDate()
  periodEnd?: string;
}
