import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPaymentResponseDto } from './subscription-payment-response.dto';

export class SubscriptionSinpeInstructionsDto {
  @ApiProperty()
  phone!: string;

  @ApiProperty()
  holderName!: string;

  @ApiProperty()
  priceCrc!: number;
}

export class SubscriptionResponseDto {
  @ApiProperty({ enum: ['FREE', 'PRO'] })
  plan!: 'FREE' | 'PRO';

  @ApiPropertyOptional({ enum: ['PAID', 'COMPLIMENTARY'], nullable: true })
  source!: 'PAID' | 'COMPLIMENTARY' | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  proUntil!: Date | null;

  @ApiProperty()
  periodDays!: number;

  @ApiPropertyOptional({
    type: SubscriptionSinpeInstructionsDto,
    nullable: true,
  })
  sinpe!: SubscriptionSinpeInstructionsDto | null;

  @ApiPropertyOptional({ type: SubscriptionPaymentResponseDto, nullable: true })
  pendingPayment!: SubscriptionPaymentResponseDto | null;

  @ApiPropertyOptional({ type: SubscriptionPaymentResponseDto, nullable: true })
  lastRejectedPayment!: SubscriptionPaymentResponseDto | null;
}
