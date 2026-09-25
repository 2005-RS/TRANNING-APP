import { Link } from '@tanstack/react-router';
import { ShieldCheck, UserRound, Users } from 'lucide-react';
import {
  PublicAssistantNote,
  PublicContainer,
  PublicFeatureGrid,
  PublicPageHero,
  PublicSignInCta,
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
      <PublicPageHero eyebrow={home.eyebrow} heading={home.heading} body={home.body}>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={account.to} className={cn(buttonVariants({ size: 'lg' }))}>
            {account.signedIn ? account.label : home.primary}
          </Link>
          <Link to="/platform" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {home.secondary}
          </Link>
        </div>
        <p className="mt-6 max-w-xl text-sm text-muted-foreground">{copy.accessNote}</p>
      </PublicPageHero>

      <PublicFeatureGrid
        heading={home.rolesTitle}
        items={[
          { key: 'client', icon: UserRound, ...home.roles.client },
          { key: 'trainer', icon: Users, ...home.roles.trainer },
          { key: 'admin', icon: ShieldCheck, ...home.roles.admin },
        ]}
      />

      <section className="border-t border-border py-14 sm:py-20">
        <PublicContainer>
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">{home.stepsTitle}</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="rounded-xl border border-border bg-card p-5 text-card-foreground">
                <span aria-hidden className="font-mono text-sm tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{home.steps[key].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{home.steps[key].body}</p>
              </li>
            ))}
          </ol>
        </PublicContainer>
      </section>

      <PublicAssistantNote />
      <PublicSignInCta />
    </>
  );
}
