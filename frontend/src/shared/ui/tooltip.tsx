import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return children;
}

export function Tooltip({ children }: { children: ReactNode }) {
  return <span className="relative inline-flex">{children}</span>;
}

export function TooltipTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}

export function TooltipContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 top-full z-[var(--z-dropdown)] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block group-focus-within:block',
        className,
      )}
    >
      {children}
    </span>
  );
}
