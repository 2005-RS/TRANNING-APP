import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageCircle, type LucideIcon } from 'lucide-react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { AmbientField } from '@/shared/ui/ambient-field';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

export function PublicContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</div>;
}

/**
 * Page hero. `ambient` is the home page only: taller, display type, and the
 * animated trace field. Every hero enters once on load, as one CSS sequence
 * (`.hero-enter`), so the public pages load no animation library.
 */
export function PublicPageHero({
  heading,
  body,
  children,
  ambient = false,
}: {
  heading: string;
  body: string;
  children?: ReactNode;
  ambient?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden border-b border-border',
        // On phones the copy sits high and the field rises below it.
        ambient && 'flex min-h-[min(44rem,88svh)] items-start sm:items-center',
      )}
    >
      {ambient ? (
        <AmbientField preset="home" />
      ) : (
        <div aria-hidden className="login-hero-atmosphere pointer-events-none absolute inset-0" />
      )}
      <PublicContainer className={cn('relative', ambient ? 'pb-40 pt-16 sm:py-28' : 'py-16 sm:py-24')}>
        {/* data-field-clear: the ambient field keeps its traces away from this box. */}
        <div data-field-clear className="w-fit max-w-full">
          <h1
            className={cn(
              'hero-enter text-balance text-foreground',
              ambient
                ? 'text-hero max-w-4xl'
                : 'max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl',
            )}
          >
            {heading}
          </h1>
          <p
            className={cn(
              'hero-enter max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg',
              ambient ? 'mt-7' : 'mt-5',
            )}
          >
            {body}
          </p>
          {children ? <div className="hero-enter">{children}</div> : null}
        </div>
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

/**
 * Parallel items as one panel split by hairlines, not a pile of cards. An odd
 * last item spans the row so the panel never shows an empty cell.
 */
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
    <section className="py-16 sm:py-24">
      <PublicContainer>
        {heading ? (
          <h2 className="mb-10 max-w-2xl text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {heading}
          </h2>
        ) : null}
        <ul
          className={cn(
            'grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2',
            columns === 3 && 'lg:grid-cols-3',
            columns === 4 && 'lg:grid-cols-4',
          )}
        >
          {items.map(({ key, icon: Icon, title, body }) => (
            <li
              key={key}
              className={cn(
                'bg-card p-6 text-card-foreground sm:p-8',
                'sm:[&:last-child:nth-child(odd)]:col-span-2',
                columns !== 2 && 'lg:[&:last-child:nth-child(odd)]:col-span-1',
              )}
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </PublicContainer>
    </section>
  );
}

/**
 * Last section of every public page: sign in for visitors, then where to ask
 * questions. Signed-in visitors already have their workspace link in the header.
 */
export function PublicClosing({ assistant = true }: { assistant?: boolean }) {
  const copy = usePublicSiteCopy();
  const { signedIn } = useAccountDestination();
  if (signedIn && !assistant) {
    return null;
  }

  return (
    <section className="border-t border-border py-16 sm:py-24">
      <PublicContainer>
        {signedIn ? null : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy.cta.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.cta.body}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.accessNote}</p>
            </div>
            <Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'self-start sm:self-auto')}>
              {copy.cta.signIn}
            </Link>
          </div>
        )}
        {assistant ? (
          <div className={cn('flex gap-4', !signedIn && 'mt-12 border-t border-border pt-10')}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{copy.assistant.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.assistant.body}</p>
            </div>
          </div>
        ) : null}
      </PublicContainer>
    </section>
  );
}
