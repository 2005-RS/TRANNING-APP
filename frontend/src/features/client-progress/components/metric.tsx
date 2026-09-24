import { cn } from '@/shared/lib/utils';

export function Metric({
  label,
  value,
  hint,
  quiet,
  className,
}: {
  label: string;
  value: string;
  hint?: string | null;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-numeric text-[1.65rem] font-medium leading-none tracking-tight',
          quiet ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </dd>
      {hint ? <p className="text-xs leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
