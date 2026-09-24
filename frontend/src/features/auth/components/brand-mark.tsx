import { useAuthCopy } from '@/features/auth/copy';
import { cn } from '@/shared/lib/utils';

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const authCopy = useAuthCopy();
  return (
    <div
      data-slot="brand-mark"
      className={cn('flex items-center gap-3', className)}
    >
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-muted text-[0.7rem] font-semibold tracking-[0.12em] text-foreground"
      >
        TP
      </span>
      <span
        className={cn(
          'font-medium tracking-tight text-foreground',
          compact ? 'sr-only text-sm sm:not-sr-only sm:inline' : 'text-base',
        )}
      >
        {authCopy.brandSlotLabel}
      </span>
    </div>
  );
}
