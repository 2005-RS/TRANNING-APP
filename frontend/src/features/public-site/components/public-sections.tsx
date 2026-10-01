import type { ReactNode } from 'react';
import { MessageCircle, type LucideIcon } from 'lucide-react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { CtaLink, LandingContainer, Reveal } from '@/features/public-site/components/landing/landing-primitives';
import { cn } from '@/shared/lib/utils';

export function PublicContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <LandingContainer className={className}>{children}</LandingContainer>;
}

/**
 * Hero of the detailed public pages (the home page has its own LandingHero).
 * Same identity as the landing: eyebrow, uppercase display heading, orange
 * light and floor grid, and an optional visual on the right. Enters once on
 * load as one CSS sequence (`.hero-enter`); the grid never animates.
 */
export function PublicPageHero({
  eyebrow,
  heading,
  body,
  visual,
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  visual?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate -mt-16 overflow-hidden border-b border-border pt-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="landing-glow -top-48 -left-40 size-[40rem] opacity-60" />
        <div className="landing-glow -right-40 -bottom-64 size-[36rem] opacity-50" />
        <div className="landing-grid opacity-40" />
      </div>
      <PublicContainer
        className={cn(
          'relative grid items-center gap-12 py-16 sm:py-24',
          visual && 'lg:grid-cols-[1.3fr_0.7fr] lg:gap-16',
        )}
      >
        <div>
          <p className="hero-enter landing-eyebrow">{eyebrow}</p>
          <h1 className="hero-enter landing-display mt-5 max-w-4xl text-[clamp(2rem,3.6vw,3.5rem)] text-balance text-foreground">
            {heading}
          </h1>
          <p className="hero-enter mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {body}
          </p>
          {children ? <div className="hero-enter">{children}</div> : null}
        </div>
        {visual ? <div className="hero-enter relative">{visual}</div> : null}
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
 * Parallel items as numbered panels that enter in sequence. An odd last item
 * spans the row so the grid never shows an empty cell.
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
          <h2 className="landing-display mb-10 max-w-2xl text-3xl text-balance text-foreground sm:text-4xl">{heading}</h2>
        ) : null}
        <ul
          className={cn(
            'grid gap-4 sm:grid-cols-2',
            columns === 3 && 'lg:grid-cols-3',
            columns === 4 && 'lg:grid-cols-4',
          )}
        >
          {items.map(({ key, icon: Icon, title, body }, index) => (
            <Reveal
              as="li"
              key={key}
              delay={(index % columns) * 0.06}
              y={16}
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground transition-colors duration-300 hover:border-primary/40 sm:p-8 motion-reduce:transition-none',
                'sm:[&:last-child:nth-child(odd)]:col-span-2',
                columns !== 2 && 'lg:[&:last-child:nth-child(odd)]:col-span-1',
              )}
            >
              <div
                aria-hidden
                className="absolute -top-24 -right-24 size-48 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
              />
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span aria-hidden className="font-mono text-xs text-muted-foreground/70">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-6 text-base font-semibold tracking-wide uppercase">{title}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{body}</p>
            </Reveal>
          ))}
        </ul>
      </PublicContainer>
    </section>
  );
}

/**
 * Last section of every detailed public page: sign in for visitors, then where
 * to ask questions. Signed-in visitors already have their workspace link.
 */
export function PublicClosing({ assistant = true }: { assistant?: boolean }) {
  const copy = usePublicSiteCopy();
  const { signedIn } = useAccountDestination();
  if (signedIn && !assistant) {
    return null;
  }

  return (
    <section className="relative isolate overflow-hidden border-t border-border py-16 sm:py-24">
      <div aria-hidden className="landing-glow bottom-[-18rem] left-1/2 -z-10 size-[40rem] -translate-x-1/2 opacity-60" />
      <PublicContainer>
        {signedIn ? null : (
          <Reveal className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="landing-display text-3xl text-balance text-foreground sm:text-5xl">{copy.cta.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.cta.body}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.accessNote}</p>
            </div>
            <CtaLink to="/login" className="self-start sm:self-auto">
              {copy.cta.signIn}
            </CtaLink>
          </Reveal>
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

/** A graded photo panel for page heroes (decorative). */
export function PublicHeroPhoto({ src, width, height, className }: { src: string; width: number; height: number; className?: string }) {
  return (
    <div aria-hidden className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border sm:aspect-[16/10] lg:aspect-[4/5]">
      <img
        src={src}
        alt=""
        width={width}
        height={height}
        fetchPriority="high"
        decoding="async"
        className={cn('landing-photo absolute inset-0 size-full object-cover', className)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
    </div>
  );
}
