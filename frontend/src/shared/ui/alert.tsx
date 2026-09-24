import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'danger' | 'muted';
};

export function Alert({
  className,
  variant = 'muted',
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-3 py-2.5 text-sm',
        variant === 'danger'
          ? 'border-danger/40 bg-danger/10 text-foreground'
          : 'border-border bg-muted text-foreground',
        className,
      )}
      {...props}
    />
  );
}
