import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { CtaLink, LandingContainer, Reveal, SectionTitle } from './landing-primitives';
import { useReducedMotion, useSectionProgress } from './landing-motion';

const STEP_KEYS = ['one', 'two', 'three', 'four'] as const;

/** How it works: the real four-step flow (admin creates accounts → trainer plans → client trains → review). */
export function LandingSteps() {
  const { landing, home } = usePublicSiteCopy();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const scrollYProgress = useSectionProgress(ref, ['start 0.8', 'end 0.6']);
  const lineScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1]);

  return (
    <section id="como-funciona" aria-labelledby="landing-steps-title" className="relative scroll-mt-16 border-t border-border py-24 sm:py-32">
      <LandingContainer>
        <SectionTitle id="landing-steps-title" eyebrow={landing.steps.eyebrow} title={[landing.steps.title]} />
        <ol ref={ref} className="relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-8">
          {/* Rail that fills as the steps scroll by: down on phones, across on desktop. */}
          <span aria-hidden className="absolute top-4 bottom-4 left-4 w-px bg-border lg:top-4 lg:right-4 lg:bottom-auto lg:left-4 lg:h-px lg:w-auto" />
          <motion.span
            aria-hidden
            className="absolute top-4 bottom-4 left-4 hidden w-auto origin-left bg-primary lg:right-4 lg:bottom-auto lg:block lg:h-px"
            style={{ scaleX: lineScale }}
          />
          <motion.span
            aria-hidden
            className="absolute top-4 bottom-4 left-4 w-px origin-top bg-primary lg:hidden"
            style={{ scaleY: lineScale }}
          />
          {STEP_KEYS.map((key, index) => (
            <Reveal as="li" key={key} delay={index * 0.1} className="relative pl-14 lg:pt-14 lg:pl-0">
              <span
                aria-hidden
                className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border border-primary/50 bg-background font-mono text-xs text-primary"
              >
                {index + 1}
              </span>
              <h3 className="text-base font-semibold tracking-tight uppercase">{home.steps[key].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{home.steps[key].body}</p>
            </Reveal>
          ))}
        </ol>
      </LandingContainer>
    </section>
  );
}

/** Final call to action over a slow photo parallax. */
export function LandingFinal() {
  const copy = usePublicSiteCopy();
  const { final } = copy.landing;
  const account = useAccountDestination();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useSectionProgress(ref, ['start end', 'end start']);
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-10%', '10%']);

  return (
    <section ref={ref} aria-labelledby="landing-final-title" className="relative isolate overflow-hidden py-28 sm:py-40">
      <motion.img
        src="/landing/cta-plates.webp"
        alt=""
        loading="lazy"
        decoding="async"
        className="landing-photo absolute inset-x-0 -top-[10%] -z-20 h-[120%] w-full object-cover opacity-50"
        style={{ y: photoY }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-background" />
      <div aria-hidden className="landing-glow bottom-[-20rem] left-1/2 -z-10 size-[48rem] -translate-x-1/2 opacity-80" />
      <LandingContainer className="flex flex-col items-center text-center">
        <SectionTitle
          id="landing-final-title"
          eyebrow={copy.nav.start}
          title={final.title}
          body={final.body}
          align="center"
          className="[&_h2]:text-[clamp(2.6rem,8vw,6.5rem)]"
        />
        <Reveal delay={0.15} className="mt-10 flex flex-col items-center gap-4">
          <CtaLink to={account.to}>{account.signedIn ? account.label : final.primary}</CtaLink>
          {account.signedIn ? null : <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{copy.accessNote}</p>}
        </Reveal>
      </LandingContainer>
    </section>
  );
}
