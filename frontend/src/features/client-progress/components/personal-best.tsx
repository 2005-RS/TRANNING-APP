import { clientProgressCopy } from '@/features/client-progress/copy';
import { formatIsoDate } from '@/features/client-progress/lib/formatters';

export function PersonalBest({
  label,
  value,
  record,
  hint,
}: {
  label: string;
  value: string | null;
  record?: { performedAt: string } | null;
  hint?: string;
}) {
  if (!value) {
    return null;
  }

  const achieved = record ? formatIsoDate(record.performedAt, 'd MMM yyyy') : null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-numeric text-xl font-medium text-foreground">{value}</p>
      {achieved ? (
        <p className="text-xs text-muted-foreground">
          {clientProgressCopy.detail.firstAchieved} {achieved}
        </p>
      ) : null}
      {hint ? <p className="text-xs leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
