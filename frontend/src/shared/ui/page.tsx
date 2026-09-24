import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';

type Density = 'client' | 'productivity';

export function PageContainer({
  className,
  density = 'productivity',
  ...props
}: HTMLAttributes<HTMLDivElement> & { density?: Density }) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        density === 'client'
          ? 'max-w-none px-5 py-5 sm:px-6 sm:py-7 lg:px-8'
          : 'max-w-[var(--container-wide)] px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
      {...props}
    />
  );
}

export function PageTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
        className,
      )}
      {...props}
    />
  );
}

export function PageDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base', className)}
      {...props}
    />
  );
}

export function PageActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export function Section({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn('space-y-4', className)} {...props} />;
}

export function ContentSkeleton({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('space-y-4 p-4 sm:p-6', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function PageIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <PageHeader>
      <div className="space-y-2">
        <PageTitle>{title}</PageTitle>
        {description ? <PageDescription>{description}</PageDescription> : null}
      </div>
      {actions ? <PageActions>{actions}</PageActions> : null}
    </PageHeader>
  );
}
