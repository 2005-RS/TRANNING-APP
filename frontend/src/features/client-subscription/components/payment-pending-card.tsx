import type { SubscriptionPaymentResponseDto } from '@/generated/models';
import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { formatNumber } from '@/i18n/format';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';

export function PaymentPendingCard({
  payment,
  rejected = false,
}: {
  payment: SubscriptionPaymentResponseDto;
  rejected?: boolean;
}) {
  const copy = useClientSubscriptionCopy();
  const amount = formatNumber(payment.amountCrc, {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-semibold">{copy.paymentTimeline}</h2>
      <ol className="space-y-3 text-sm">
        <TimelineStep number={1} label={copy.reported} state="done" />
        <TimelineStep
          number={2}
          label={rejected ? copy.rejectedStatus : copy.pending}
          state={rejected ? 'failed' : 'current'}
        />
        <TimelineStep number={3} label={copy.active} state="upcoming" />
      </ol>
      <p className="text-sm text-muted-foreground">
        {payment.reference} · {payment.paidOn} · {amount}
      </p>
      {rejected && typeof payment.rejectionReason === 'string' ? (
        <p className="text-sm text-danger">{payment.rejectionReason}</p>
      ) : null}
    </Card>
  );
}

type StepState = 'done' | 'current' | 'failed' | 'upcoming';

function TimelineStep({ number, label, state }: { number: number; label: string; state: StepState }) {
  return (
    <li className="flex items-center gap-3" aria-current={state === 'current' ? 'step' : undefined}>
      <span
        aria-hidden
        className={cn(
          'text-numeric flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
          state === 'done' && 'border-primary bg-primary text-primary-foreground',
          state === 'current' && 'border-primary text-primary',
          state === 'failed' && 'border-danger text-danger',
          state === 'upcoming' && 'border-border text-muted-foreground',
        )}
      >
        {number}
      </span>
      <span className={cn('font-medium', state === 'upcoming' && 'font-normal text-muted-foreground')}>
        {label}
      </span>
    </li>
  );
}
