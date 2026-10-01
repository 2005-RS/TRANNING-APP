import { ClipboardList, Dumbbell, LineChart, Salad, type LucideIcon } from 'lucide-react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { LandingContainer, Reveal } from './landing-primitives';

const BENEFITS: ReadonlyArray<{ key: 'training' | 'nutrition' | 'progress' | 'coach'; icon: LucideIcon }> = [
  { key: 'training', icon: Dumbbell },
  { key: 'nutrition', icon: Salad },
  { key: 'progress', icon: LineChart },
  { key: 'coach', icon: ClipboardList },
];

/** A single band split by hairlines: what the product includes, at a glance. */
export function LandingBenefits() {
  const { landing } = usePublicSiteCopy();
  return (
    <section id="que-incluye" aria-labelledby="landing-benefits-title" className="relative scroll-mt-20 border-y border-border">
      <h2 id="landing-benefits-title" className="sr-only">
        {landing.benefits.title}
      </h2>
      <LandingContainer>
        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {BENEFITS.map(({ key, icon: Icon }, index) => (
            <Reveal
              as="li"
              key={key}
              delay={index * 0.08}
              y={16}
              className="group flex items-start gap-4 py-7 sm:px-2 lg:px-8 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold tracking-wide uppercase">{landing.benefits[key].title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{landing.benefits[key].body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}
