import { ApiProperty } from '@nestjs/swagger';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import { CheckInResponseFieldsDto } from './check-in-response-fields.dto';

export class CreateCheckInDto extends CheckInResponseFieldsDto {
  @ApiProperty({
    example: '2026-08-24',
    description:
      'Inclusive period start (YYYY-MM-DD). Server does not infer week boundaries. periodEnd must be on or after periodStart. Maximum length is 31 days (periodEnd − periodStart ≤ 31).',
  })
  @IsStrictIsoDate()
  periodStart!: string;

  @ApiProperty({
    example: '2026-08-30',
    description:
      'Inclusive period end (YYYY-MM-DD). Exact duplicate (client, periodStart, periodEnd) is rejected. Overlapping but non-identical periods are allowed in v1.',
  })
  @IsStrictIsoDate()
  periodEnd!: string;
}
