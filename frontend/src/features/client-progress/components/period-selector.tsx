import { clientProgressCopy } from '@/features/client-progress/copy';
import { PROGRESS_PERIODS, type ProgressPeriod } from '@/features/client-progress/lib/period';
import { cn } from '@/shared/lib/utils';

export function PeriodSelector({
  period,
  onPeriodChange,
  className,
}: {
  period: ProgressPeriod;
  onPeriodChange: (period: ProgressPeriod) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label={clientProgressCopy.periodLabel}
    >
      {PROGRESS_PERIODS.map((value) => {
        const selected = period === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={clientProgressCopy.periodAria[value]}
            className={cn(
              'min-h-11 min-w-11 rounded-full px-3 text-sm font-medium',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
            onClick={() => {
              onPeriodChange(value);
            }}
          >
            {clientProgressCopy.periods[value]}
          </button>
        );
      })}
    </div>
  );
}
