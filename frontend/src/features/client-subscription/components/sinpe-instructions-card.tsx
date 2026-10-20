import type { SubscriptionSinpeInstructionsDto } from '@/generated/models';
import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { formatNumber } from '@/i18n/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

function formatCrc(value: number): string {
  return formatNumber(value, { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

export function SinpeInstructionsCard({
  sinpe,
  isRenewal,
}: {
  sinpe: SubscriptionSinpeInstructionsDto;
  isRenewal: boolean;
}) {
  const copy = useClientSubscriptionCopy();

  async function copyPhone(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(sinpe.phone);
    } catch {
      // Clipboard access is optional; the visible phone remains available.
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold">{isRenewal ? copy.renew : copy.instructions}</h2>
      <ol className="space-y-4 text-sm">
        <li><span className="font-medium">1. {copy.stepOne}</span></li>
        <li className="space-y-2">
          <span className="font-medium">2. {copy.stepTwo}</span>
          <p className="text-numeric text-3xl font-semibold">{sinpe.phone}</p>
          <p>{copy.holder}: {sinpe.holderName}</p>
          <p>{copy.amount}: {formatCrc(sinpe.priceCrc)}</p>
        </li>
        <li><span className="font-medium">3. {copy.stepThree}</span></li>
      </ol>
      <Button type="button" variant="outline" onClick={() => void copyPhone()}>
        {copy.copyPhone}
      </Button>
    </Card>
  );
}
