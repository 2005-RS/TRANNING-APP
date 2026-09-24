import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-medium tracking-wide text-foreground', className)}
      {...props}
    />
  );
}
