import { usePublicSiteCopy } from '@/features/public-site/copy';
import { cn } from '@/shared/lib/utils';
import { LandingContainer, Reveal, SectionTitle } from './landing-primitives';

const GOALS = [
  { key: 'fatLoss', image: '/landing/goal-fat-loss.webp', position: 'object-center' },
  { key: 'muscle', image: '/landing/training-cable.webp', position: 'object-[40%_center]' },
  { key: 'performance', image: '/landing/goal-performance.webp', position: 'object-center' },
  { key: 'wellbeing', image: '/landing/goal-wellbeing.webp', position: 'object-center' },
] as const;

/** Four goals as tall photo panels; hover lifts the photo and reveals the line. */
export function LandingGoals() {
  const { landing } = usePublicSiteCopy();
  const { goals } = landing;
  return (
    <section aria-labelledby="landing-goals-title" className="relative py-24 sm:py-32">
      <LandingContainer>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle id="landing-goals-title" eyebrow={goals.eyebrow} title={goals.title} />
          <Reveal delay={0.1} className="max-w-sm">
            <p className="text-base leading-relaxed text-muted-foreground">{goals.body}</p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GOALS.map((goal, index) => (
            <Reveal as="li" key={goal.key} delay={index * 0.08}>
              <article className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl border border-border p-6 sm:aspect-[3/4]">
                <img
                  src={goal.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    'landing-photo absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
                    goal.position,
                  )}
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/10" />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-primary/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
                />
                <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="landing-display mt-2 text-2xl sm:text-3xl">{goals[goal.key].title}</h3>
                <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-white/75">{goals[goal.key].body}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}
