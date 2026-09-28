import { Link } from '@tanstack/react-router';
import { ShieldCheck, UserRound, Users } from 'lucide-react';
import {
  PublicClosing,
  PublicContainer,
  PublicFeatureGrid,
  PublicPageHero,
} from '@/features/public-site/components/public-sections';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

const STEP_KEYS = ['one', 'two', 'three', 'four'] as const;

export function PublicHomePage() {
  const copy = usePublicSiteCopy();
  const { home } = copy;
  const account = useAccountDestination();

  return (
    <>
      <PublicPageHero heading={home.heading} body={home.body} ambient>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to={account.to} className={cn(buttonVariants({ size: 'lg' }))}>
            {account.signedIn ? account.label : home.primary}
          </Link>
          <Link to="/platform" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {home.secondary}
          </Link>
        </div>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">{copy.accessNote}</p>
      </PublicPageHero>

      <PublicFeatureGrid
        heading={home.rolesTitle}
        items={[
          { key: 'client', icon: UserRound, ...home.roles.client },
          { key: 'trainer', icon: Users, ...home.roles.trainer },
          { key: 'admin', icon: ShieldCheck, ...home.roles.admin },
        ]}
      />

      <section className="border-t border-border py-16 sm:py-24">
        <PublicContainer>
          <h2 className="mb-12 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {home.stepsTitle}
          </h2>
          <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="relative pl-14 lg:pl-0 lg:pt-14">
                {index < STEP_KEYS.length - 1 ? (
                  // Connects this step to the next: down on mobile, across on desktop.
                  <span
                    aria-hidden
                    className="absolute -bottom-10 left-4 top-10 w-px bg-border lg:-right-8 lg:bottom-auto lg:left-10 lg:top-4 lg:h-px lg:w-auto"
                  />
                ) : null}
                <span
                  aria-hidden
                  className="text-numeric absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground"
                >
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold tracking-tight text-foreground">{home.steps[key].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{home.steps[key].body}</p>
              </li>
            ))}
          </ol>
        </PublicContainer>
      </section>

      <PublicClosing />
    </>
  );
}
