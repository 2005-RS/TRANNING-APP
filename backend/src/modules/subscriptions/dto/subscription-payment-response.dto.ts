import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPaymentStatus } from '../enums/subscription-payment.enum';

export class SubscriptionPaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SubscriptionPaymentStatus })
  status!: SubscriptionPaymentStatus;

  @ApiProperty()
  amountCrc!: number;

  @ApiProperty()
  reference!: string;

  @ApiPropertyOptional({ nullable: true })
  payerPhone!: string | null;

  @ApiProperty({ format: 'date' })
  paidOn!: string;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  periodStart!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  periodEnd!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  reviewedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
