import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export function Separator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn('h-px w-full bg-border', className)}
      {...props}
    />
  );
}
