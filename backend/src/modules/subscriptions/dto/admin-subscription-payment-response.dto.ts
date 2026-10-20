import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../clients/dto/client-response.dto';
import { SubscriptionPaymentResponseDto } from './subscription-payment-response.dto';

export class SubscriptionPaymentClientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class AdminSubscriptionPaymentResponseDto extends SubscriptionPaymentResponseDto {
  @ApiProperty({ type: SubscriptionPaymentClientSummaryDto })
  client!: SubscriptionPaymentClientSummaryDto;
}

export class PaginatedSubscriptionPaymentsResponseDto {
  @ApiProperty({ type: [AdminSubscriptionPaymentResponseDto] })
  data!: AdminSubscriptionPaymentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
