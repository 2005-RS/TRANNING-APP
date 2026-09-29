import { cn } from '@/shared/lib/utils';
import type { HTMLAttributes } from 'react';

export function DashboardCard({
  className,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: 'default' | 'hero' | 'hero-calm';
}) {
  return (
    <section
      className={cn(
        'client-surface-card space-y-4',
        tone === 'hero' && 'dashboard-hero-card dashboard-hero-card--action',
        tone === 'hero-calm' && 'dashboard-hero-card dashboard-hero-card--calm',
        className,
      )}
      {...props}
    />
  );
}
