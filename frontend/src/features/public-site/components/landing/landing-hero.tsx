import { useRef, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, Dumbbell, Flame } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { AmbientField } from '@/shared/ui/ambient-field';
import { cn } from '@/shared/lib/utils';
import { Ring } from './app-screens';
import { CtaLink, LandingContainer } from './landing-primitives';
import { LANDING_ENTER, usePointerEffects, useReducedMotion, useSectionProgress } from './landing-motion';

/** Delay (s) of each step of the entrance sequence. */
const ENTER = { eyebrow: 0.15, headline: 0.28, body: 0.62, cta: 0.74, visual: 0.45, cards: 0.95 } as const;

const VOLUME = [38, 46, 42, 55, 51, 62, 68, 74];

function useEnter(delay: number, y = 22) {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { ...LANDING_ENTER, delay: reduce ? 0 : delay },
  } as const;
}

/**
 * A floating product card. Scroll moves it at its own speed (`y`); a fine
 * pointer adds a small tilt. Both are MotionValues, so no React re-render.
 */
function FloatingCard({
  className,
  y,
  tiltX,
  tiltY,
  depth,
  delay,
  children,
}: {
  className?: string;
  y?: MotionValue<number>;
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  depth: number;
  delay: number;
  children: ReactNode;
}) {
  const enter = useEnter(delay, 30);
  const rotateX = useTransform(tiltY, (v) => v * -6 * depth);
  const rotateY = useTransform(tiltX, (v) => v * 8 * depth);
  const x = useTransform(tiltX, (v) => v * 14 * depth);
  return (
    <motion.div className={cn('absolute', className)} style={{ y }}>
      <motion.div {...enter}>
        <motion.div
          className="landing-float rounded-2xl p-4"
          style={{ rotateX, rotateY, x, transformPerspective: 900 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function LandingHero() {
  const copy = usePublicSiteCopy();
  const { landing } = copy;
  const account = useAccountDestination();
  const reduce = useReducedMotion();
  const pointer = usePointerEffects();
  const ref = useRef<HTMLElement>(null);

  // Hero scroll moment: native scroll drives every layer at its own rate.
  const scrollYProgress = useSectionProgress(ref, ['start start', 'end start']);
  const still = reduce ?? false;
  const headlineY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, -140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], still ? [1, 1] : [1, 0]);
  const photoY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, 120]);
  const photoScale = useTransform(scrollYProgress, [0, 1], still ? [1, 1] : [1.04, 1.14]);
  const gridY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, 60]);
  const cardFastY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, -220]);
  const cardMidY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, -140]);
  const cardSlowY = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, -70]);

  // Pointer tilt (desktop fine pointer only), smoothed by springs.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(pointerX, { stiffness: 120, damping: 20, mass: 0.4 });
  const tiltY = useSpring(pointerY, { stiffness: 120, damping: 20, mass: 0.4 });
  const glowX = useTransform(tiltX, (v) => v * 60);
  const glowY = useTransform(tiltY, (v) => v * 40);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const cards = landing.heroCards;

  return (
    <section
      ref={ref}
      aria-labelledby="landing-hero-title"
      onPointerMove={pointer ? handlePointerMove : undefined}
      onPointerLeave={pointer ? handlePointerLeave : undefined}
      className="relative isolate -mt-16 flex min-h-[100svh] items-start overflow-hidden pt-32 pb-16 sm:pt-36 lg:items-center lg:pt-24"
    >
      {/* Layer 1: photo, graded dark and warm, pushed right so the copy sits on black. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-30"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: LANDING_ENTER.ease }}
        style={{ y: photoY, scale: photoScale }}
      >
        <img
          src="/landing/hero-athlete.webp"
          alt=""
          width={960}
          height={637}
          fetchPriority="high"
          decoding="async"
          className="landing-photo absolute inset-y-0 right-0 h-full w-full object-cover object-[72%_30%] opacity-70 lg:w-[68%] lg:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10 lg:via-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />
      </motion.div>

      {/* Layer 2: WebGL ridges (pauses offscreen, still frame on reduced motion). */}
      <AmbientField preset="home" className="-z-20 opacity-70 mix-blend-screen" />

      {/* Layer 3: perspective floor grid and orange light. */}
      <motion.div aria-hidden className="absolute inset-0 -z-10" style={{ y: gridY }}>
        <div className="landing-grid opacity-50" />
      </motion.div>
      <motion.div
        aria-hidden
        className="landing-glow -z-10 size-[42rem] -top-40 -left-40 opacity-60"
        style={pointer ? { x: glowX, y: glowY } : undefined}
      />
      <div aria-hidden className="landing-glow -z-10 size-[36rem] right-[-10rem] bottom-[-12rem] opacity-70" />

      <LandingContainer className="relative grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div data-field-clear className="@container w-full max-w-2xl" style={{ y: headlineY, opacity: contentOpacity }}>
          <motion.p className="landing-eyebrow" {...useEnter(ENTER.eyebrow, 12)}>
            {landing.eyebrow}
          </motion.p>
          <h1 id="landing-hero-title" className="landing-display mt-5 text-[clamp(2.25rem,14.8cqi,8.5rem)]">
            {/* Screen readers get one sentence; the masked lines are visual only. */}
            <span className="sr-only">{landing.headline.join(' ')}</span>
            {landing.headline.map((line, index) => (
              <HeadlineLine key={line} delay={ENTER.headline + index * 0.1} accent={index === landing.headline.length - 1}>
                {line}
              </HeadlineLine>
            ))}
          </h1>
          <motion.p
            className="mt-7 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
            {...useEnter(ENTER.body, 14)}
          >
            {landing.body}
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap items-center gap-3" {...useEnter(ENTER.cta, 14)}>
            <CtaLink to={account.to}>{account.signedIn ? account.label : landing.primary}</CtaLink>
            <CtaLink to="/" hash="la-app" variant="ghost">
              {landing.secondary}
            </CtaLink>
          </motion.div>
          <motion.p className="mt-5 max-w-md text-xs leading-relaxed text-muted-foreground/80" {...useEnter(ENTER.cta + 0.1, 8)}>
            {copy.accessNote}
          </motion.p>
        </motion.div>

        {/* Layer 4: floating product UI (sample data), each card at its own depth. */}
        <div aria-hidden className="relative hidden h-[34rem] lg:block">
          <FloatingCard className="top-6 right-6 w-64" y={cardMidY} tiltX={tiltX} tiltY={tiltY} depth={1} delay={ENTER.cards}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Dumbbell className="size-3.5 text-primary" />
              {cards.workoutTitle}
            </div>
            <p className="mt-2 text-lg font-semibold">{cards.workoutName}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{cards.workoutDetail}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/5 rounded-full bg-primary" />
            </div>
          </FloatingCard>
          <FloatingCard className="top-48 left-0 w-56" y={cardFastY} tiltX={tiltX} tiltY={tiltY} depth={1.6} delay={ENTER.cards + 0.12}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="size-3.5 text-primary" />
              {cards.nutritionTitle}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Ring value={0.52} size={56} stroke={6}>
                <span className="font-mono text-[11px] font-semibold text-primary">1,144</span>
              </Ring>
              <p className="text-xs leading-snug text-muted-foreground">{cards.nutritionRemaining}</p>
            </div>
          </FloatingCard>
          <FloatingCard className="right-0 bottom-4 w-72" y={cardSlowY} tiltX={tiltX} tiltY={tiltY} depth={0.7} delay={ENTER.cards + 0.24}>
            <p className="text-xs text-muted-foreground">{cards.progressTitle}</p>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {VOLUME.map((value, index) => (
                <span
                  key={index}
                  className={cn('flex-1 rounded-sm', index === VOLUME.length - 1 ? 'bg-primary' : 'bg-white/15')}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{cards.progressDetail}</p>
          </FloatingCard>
          <motion.p
            className="absolute bottom-[-2.5rem] left-0 text-[11px] tracking-wider text-muted-foreground/70 uppercase"
            {...useEnter(ENTER.cards + 0.4, 0)}
          >
            {landing.demoLabel}
          </motion.p>
        </div>
      </LandingContainer>

      <motion.a
        href="#que-incluye"
        aria-label={landing.scrollHint}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[10px] tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-foreground sm:flex"
        style={{ opacity: contentOpacity }}
      >
        {landing.scrollHint}
        <ChevronDown className="size-4" aria-hidden />
      </motion.a>
    </section>
  );
}

function HeadlineLine({ children, delay, accent }: { children: string; delay: number; accent: boolean }) {
  const reduce = useReducedMotion();
  return (
    // Each line rises out of its own mask for a clean, editorial entrance.
    <span aria-hidden className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className={cn('block', accent && 'text-primary')}
        initial={reduce ? false : { y: '105%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.9, ease: LANDING_ENTER.ease, delay: reduce ? 0 : delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}
