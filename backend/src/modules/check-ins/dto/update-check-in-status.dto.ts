import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CheckInSubmitStatus } from '../enums/check-in-submit-status.enum';

export class UpdateCheckInStatusDto {
  @ApiProperty({
    enum: CheckInSubmitStatus,
    description:
      'Only SUBMITTED is accepted. DRAFT CheckIns become immutable Client responses. Repeat SUBMITTED on an already SUBMITTED CheckIn is idempotent. REVIEWED cannot move back to SUBMITTED.',
  })
  @IsEnum(CheckInSubmitStatus)
  status!: CheckInSubmitStatus;
}
