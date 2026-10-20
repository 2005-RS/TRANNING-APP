import { SubscriptionPaymentResponseDto } from './dto/subscription-payment-response.dto';
import { SubscriptionPayment } from './entities/subscription-payment.entity';

export function toSubscriptionPaymentResponse(
  payment: SubscriptionPayment,
): SubscriptionPaymentResponseDto {
  return {
    id: payment.id,
    status: payment.status,
    amountCrc: payment.amountCrc,
    reference: payment.reference,
    payerPhone: payment.payerPhone,
    paidOn: payment.paidOn,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    reviewedByUserId: payment.reviewedByUserId,
    reviewedAt: payment.reviewedAt,
    rejectionReason: payment.rejectionReason,
    createdAt: payment.createdAt,
  };
}
