import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageCircle, type LucideIcon } from 'lucide-react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

export function PublicContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</div>;
}

export function PublicPageHero({
  eyebrow,
  heading,
  body,
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="login-hero-atmosphere pointer-events-none absolute inset-0" />
      <PublicContainer className="relative py-16 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {heading}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{body}</p>
        {children}
      </PublicContainer>
    </section>
  );
}

export type PublicFeature = {
  key: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

export function PublicFeatureGrid({
  heading,
  items,
  columns = 3,
}: {
  heading?: string;
  items: ReadonlyArray<PublicFeature>;
  columns?: 2 | 3 | 4;
}) {
  return (
    <section className="py-14 sm:py-20">
      <PublicContainer>
        {heading ? (
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">{heading}</h2>
        ) : null}
        <ul
          className={cn(
            'grid gap-4 sm:grid-cols-2',
            columns === 3 && 'lg:grid-cols-3',
            columns === 4 && 'lg:grid-cols-4',
          )}
        >
          {items.map(({ key, icon: Icon, title, body }) => (
            <li key={key} className="rounded-xl border border-border bg-card p-5 text-card-foreground">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </PublicContainer>
    </section>
  );
}

export function PublicAssistantNote() {
  const copy = usePublicSiteCopy();
  return (
    <section className="border-t border-border py-12">
      <PublicContainer className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{copy.assistant.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.assistant.body}</p>
        </div>
      </PublicContainer>
    </section>
  );
}

export function PublicSignInCta() {
  const copy = usePublicSiteCopy();
  const { signedIn } = useAccountDestination();
  if (signedIn) {
    return null;
  }
  return (
    <section className="border-t border-border py-14">
      <PublicContainer className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{copy.cta.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy.cta.body}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy.accessNote}</p>
        </div>
        <Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'self-start sm:self-auto')}>
          {copy.cta.signIn}
        </Link>
      </PublicContainer>
    </section>
  );
}
