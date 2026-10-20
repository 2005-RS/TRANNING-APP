import { Check } from 'lucide-react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { CtaLink, LandingContainer, SectionTitle } from './landing-primitives';

export function LandingPlans() {
  const copy = usePublicSiteCopy().landing.plans;

  return (
    <section aria-labelledby="landing-plans-title" className="border-y border-border py-20 sm:py-28">
      <LandingContainer>
        <SectionTitle
          id="landing-plans-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          body={copy.body}
          align="center"
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <PlanCard title={copy.free.title} features={copy.free.features} cta={copy.cta} />
          <PlanCard title={copy.pro.title} features={copy.pro.features} cta={copy.cta} featured />
        </div>
      </LandingContainer>
    </section>
  );
}

function PlanCard({
  title,
  features,
  cta,
  featured = false,
}: {
  title: string;
  features: readonly string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <article className={featured ? 'rounded-2xl border border-primary/60 bg-primary/10 p-6 sm:p-8' : 'rounded-2xl border border-border bg-card/40 p-6 sm:p-8'}>
      <h3 className="landing-display text-3xl text-foreground">{title}</h3>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
      <CtaLink to="/register" className="mt-8 w-full justify-center">{cta}</CtaLink>
    </article>
  );
}
