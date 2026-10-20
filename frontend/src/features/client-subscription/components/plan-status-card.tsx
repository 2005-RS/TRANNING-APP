import type { SubscriptionResponseDto } from '@/generated/models';
import {
  SubscriptionResponseDtoPlan,
  SubscriptionResponseDtoSource,
} from '@/generated/models';
import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { formatInstant, interpolate } from '@/i18n/format';
import { Card } from '@/shared/ui/card';

export function PlanStatusCard({ subscription }: { subscription: SubscriptionResponseDto }) {
  const copy = useClientSubscriptionCopy();
  const isPro = subscription.plan === SubscriptionResponseDtoPlan.PRO;
  const title = !isPro
    ? copy.free
    : subscription.source === SubscriptionResponseDtoSource.COMPLIMENTARY
      ? copy.complimentary
      : interpolate(copy.until, { date: formatInstant(subscription.proUntil) ?? '' });

  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {isPro ? copy.proMeaning : copy.freeMeaning}
      </p>
    </Card>
  );
}
