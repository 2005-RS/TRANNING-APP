import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPaymentResponseDto } from './subscription-payment-response.dto';

export class ApproveSubscriptionPaymentResponseDto {
  @ApiProperty({ type: SubscriptionPaymentResponseDto })
  payment!: SubscriptionPaymentResponseDto;

  @ApiProperty({ type: String, format: 'date-time' })
  proUntil!: Date;
}
