import { useRef, type ComponentType, type ReactNode } from 'react';
import { CalendarCheck, Flame, TrendingUp, Trophy } from 'lucide-react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { cn } from '@/shared/lib/utils';
import {
  DashboardScreen,
  NutritionScreen,
  PhoneFrame,
  ProgressScreen,
  TrainingScreen,
  type ScreenCopy,
} from './app-screens';
import { LandingContainer, Reveal, SectionTitle } from './landing-primitives';
import { useIsDesktop, useReducedMotion, useSectionProgress } from './landing-motion';

type StepKey = 'dashboard' | 'training' | 'nutrition' | 'progress';

const STEPS: ReadonlyArray<{ key: StepKey; Screen: ComponentType<{ s: ScreenCopy }> }> = [
  { key: 'dashboard', Screen: DashboardScreen },
  { key: 'training', Screen: TrainingScreen },
  { key: 'nutrition', Screen: NutritionScreen },
  { key: 'progress', Screen: ProgressScreen },
];

const COUNT = STEPS.length;
/** Half-width of the crossfade window between two phases (in scroll progress). */
const FADE = 0.035;

function phaseRange(index: number) {
  return { start: index / COUNT, end: (index + 1) / COUNT };
}

/**
 * "All your progress in one place". On desktop the phone stays pinned
 * (position: sticky, native scroll) while four phases play: dashboard →
 * training → nutrition → progress. Phones and reduced motion get the same
 * content as a simple stacked sequence.
 */
export function LandingShowcase() {
  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion();
  const { landing } = usePublicSiteCopy();
  const { showcase } = landing;

  return (
    <section id="la-app" aria-labelledby="landing-showcase-title" className="relative scroll-mt-16">
      {isDesktop && !reduce ? (
        <PinnedShowcase />
      ) : (
        <LandingContainer className="py-24 sm:py-32">
          <SectionTitle id="landing-showcase-title" eyebrow={showcase.eyebrow} title={showcase.title} body={showcase.body} />
          <ol className="mt-14 grid gap-16 sm:grid-cols-2 sm:gap-x-10">
            {STEPS.map(({ key, Screen }, index) => (
              <Reveal as="li" key={key} className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left">
                <PhoneFrame className="max-w-[15rem]">
                  <Screen s={landing.screens} />
                </PhoneFrame>
                <div>
                  <p className="landing-eyebrow">
                    {String(index + 1).padStart(2, '0')} · {showcase.steps[key].label}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{showcase.steps[key].title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{showcase.steps[key].body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className="mt-10 text-[11px] tracking-wider text-muted-foreground/70 uppercase">{landing.demoLabel}</p>
        </LandingContainer>
      )}
    </section>
  );
}

function PinnedShowcase() {
  const { landing } = usePublicSiteCopy();
  const { showcase } = landing;
  const ref = useRef<HTMLDivElement>(null);
  const scrollYProgress = useSectionProgress(ref, ['start start', 'end end']);
  // Enter: the phone rises and settles. Release: it lifts away as the pin ends.
  const enter = useSectionProgress(ref, ['start end', 'start start']);
  const phoneScale = useTransform(enter, [0, 1], [0.86, 1]);
  const phoneRotateX = useTransform(enter, [0, 1], [18, 0]);
  const phoneRotateY = useTransform(scrollYProgress, [0, 1], [-10, 10]);
  const glowX = useTransform(scrollYProgress, [0, 1], ['-18%', '18%']);
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative h-[420vh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden pt-16">
        <motion.div aria-hidden className="landing-glow top-1/2 left-1/2 size-[46rem] -translate-1/2 opacity-70" style={{ x: glowX }} />
        <LandingContainer className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-12 xl:gap-20">
          <div>
            <SectionTitle
              id="landing-showcase-title"
              eyebrow={showcase.eyebrow}
              title={showcase.title}
              className="[&_h2]:text-[clamp(2rem,3.3vw,3.25rem)]"
            />
            <ol className="relative mt-10 space-y-5 pl-6">
              <span aria-hidden className="absolute top-1 bottom-1 left-0 w-px bg-border" />
              <motion.span
                aria-hidden
                className="absolute top-1 bottom-1 left-0 w-px origin-top bg-primary"
                style={{ scaleY: railScale }}
              />
              {STEPS.map(({ key }, index) => (
                <StepItem key={key} index={index} progress={scrollYProgress} step={showcase.steps[key]} />
              ))}
            </ol>
          </div>

          <motion.div
            className="relative w-[18.5rem] xl:w-[20rem]"
            style={{ scale: phoneScale, rotateX: phoneRotateX, rotateY: phoneRotateY, transformPerspective: 1200 }}
          >
            <PhoneFrame>
              {STEPS.map(({ key, Screen }, index) => (
                <ScreenLayer key={key} index={index} progress={scrollYProgress}>
                  <Screen s={landing.screens} />
                </ScreenLayer>
              ))}
            </PhoneFrame>
            <p className="mt-10 text-center text-[11px] tracking-wider text-muted-foreground/70 uppercase">
              {landing.demoLabel}
            </p>
          </motion.div>

          <Satellites progress={scrollYProgress} />
        </LandingContainer>
      </div>
    </div>
  );
}

/**
 * Keyframes for "outside → inside → outside" a phase. Offsets stay inside
 * [0, 1] and strictly increasing, because motion hands scroll-linked opacity
 * to the browser's ScrollTimeline, which rejects anything else.
 */
function phaseKeyframes(index: number, outside: number, inside: number) {
  const { start, end } = phaseRange(index);
  const first = index === 0;
  const last = index === COUNT - 1;
  const input = [
    ...(first ? [0] : [start - FADE, start + FADE]),
    ...(last ? [1] : [end - FADE, end + FADE]),
  ];
  const output = [
    ...(first ? [inside] : [outside, inside]),
    ...(last ? [inside] : [inside, outside]),
  ];
  return { input, output };
}

function usePhase(progress: MotionValue<number>, index: number, outside: number, inside: number) {
  const { input, output } = phaseKeyframes(index, outside, inside);
  return useTransform(progress, input, output);
}

function useFadeInOut(progress: MotionValue<number>, index: number, low = 0) {
  return usePhase(progress, index, low, 1);
}

function ScreenLayer({
  index,
  progress,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  const opacity = useFadeInOut(progress, index);
  const { start } = phaseRange(index);
  const y = useTransform(progress, index === 0 ? [0, 1] : [start - FADE, start + FADE], index === 0 ? [0, 0] : [28, 0]);
  return (
    <motion.div className="absolute inset-0" style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

function StepItem({
  index,
  progress,
  step,
}: {
  index: number;
  progress: MotionValue<number>;
  step: { label: string; title: string; body: string };
}) {
  const opacity = useFadeInOut(progress, index, 0.32);
  const x = usePhase(progress, index, 0, 8);
  return (
    <motion.li style={{ opacity, x }}>
      <p className="landing-eyebrow">
        {String(index + 1).padStart(2, '0')} · {step.label}
      </p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight">{step.title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
    </motion.li>
  );
}

const SATELLITES = [
  { icon: CalendarCheck, value: '4 / 5', phase: 0 },
  { icon: Trophy, value: '82.5 kg', phase: 1 },
  { icon: Flame, value: '1,144 kcal', phase: 2 },
  { icon: TrendingUp, value: '+6 kg', phase: 3 },
] as const;

/** Small chips on the right, one per phase, drifting at a slower rate than the page. */
function Satellites({ progress }: { progress: MotionValue<number> }) {
  const { landing } = usePublicSiteCopy();
  const labels: Record<number, string> = {
    0: landing.screens.week,
    1: landing.screens.exercise,
    2: landing.screens.remaining,
    3: landing.screens.estimatedMax,
  };
  return (
    <div aria-hidden className="relative h-[28rem]">
      {SATELLITES.map((item) => (
        <Satellite key={item.phase} progress={progress} phase={item.phase} icon={item.icon} value={item.value} label={labels[item.phase] ?? ''} />
      ))}
    </div>
  );
}

function Satellite({
  progress,
  phase,
  icon: Icon,
  value,
  label,
}: {
  progress: MotionValue<number>;
  phase: number;
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  const opacity = useFadeInOut(progress, phase, 0.18);
  const { start, end } = phaseRange(phase);
  const y = useTransform(progress, [Math.max(0, start - FADE), Math.min(1, end + FADE)], [40, -40]);
  return (
    <motion.div
      className={cn('landing-float absolute left-0 flex w-60 items-center gap-3 rounded-2xl p-4', phase % 2 === 1 && 'left-10')}
      style={{ top: `${phase * 24}%`, opacity, y }}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-lg font-semibold">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}
