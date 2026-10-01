import { useRef, type ReactNode } from 'react';
import { ClipboardCheck, Flame, Target } from 'lucide-react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { Counter, LandingContainer, PointList, SectionTitle } from './landing-primitives';
import { useReducedMotion, useSectionProgress } from './landing-motion';

/** Sample meal: 40 g protein, 58 g carbs, 14 g fat ≈ 520 kcal. */
const MACROS = [
  { key: 'protein', grams: 40, share: 0.31 },
  { key: 'carbs', grams: 58, share: 0.45 },
  { key: 'fat', grams: 14, share: 0.24 },
] as const;

/**
 * "Fuel your progress". The meal card reveals itself with scroll:
 * kcal → macros → daily target → the coach's plan.
 */
export function LandingNutrition() {
  const { landing } = usePublicSiteCopy();
  const { nutrition } = landing;
  const card = nutrition.card;
  const reduce = useReducedMotion();
  const visualRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = useSectionProgress(visualRef, ['start 0.8', 'end 0.6']);
  const pass = useSectionProgress(visualRef, ['start end', 'end start']);
  const bowlScale = useTransform(pass, [0, 0.5, 1], reduce ? [1, 1, 1] : [1.12, 1.02, 1.08]);
  const bowlRotate = useTransform(pass, [0, 1], reduce ? [0, 0] : [-6, 6]);
  const cardY = useTransform(pass, [0, 1], reduce ? [0, 0] : [60, -60]);

  return (
    <section id="nutricion" aria-labelledby="landing-nutrition-title" className="relative scroll-mt-16 overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="landing-glow top-1/4 -right-40 size-[44rem] opacity-60" />
      <LandingContainer className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="lg:order-2" ref={visualRef}>
          <div className="relative mx-auto max-w-xl">
            <div className="relative aspect-square overflow-hidden rounded-full border border-border">
              <motion.img
                src="/landing/nutrition-bowl.webp"
                alt=""
                width={960}
                height={720}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover brightness-[0.85] contrast-[1.05]"
                style={{ scale: bowlScale, rotate: bowlRotate }}
              />
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_80px_30px_rgb(6_6_7)]" />
            </div>

            <motion.div
              aria-hidden
              className="landing-float relative -mt-24 ml-auto w-[min(100%,20rem)] space-y-4 rounded-3xl p-5 sm:absolute sm:right-[-1rem] sm:bottom-6 sm:mt-0 lg:right-[-3rem]"
              style={{ y: cardY }}
            >
              <Step progress={scrollYProgress} index={0} still={reduce}>
                <p className="text-xs text-muted-foreground">{card.meal}</p>
                <p className="mt-1 flex items-baseline gap-1.5">
                  <Counter to={520} className="font-mono text-4xl font-bold text-primary" />
                  <span className="text-sm text-muted-foreground">{card.calories}</span>
                </p>
              </Step>
              <Step progress={scrollYProgress} index={1} still={reduce}>
                <div className="space-y-2">
                  {MACROS.map((macro) => (
                    <div key={macro.key}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{card[macro.key]}</span>
                        <span className="font-mono">{macro.grams} g</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <MacroBar progress={scrollYProgress} share={macro.share} still={reduce} />
                      </div>
                    </div>
                  ))}
                </div>
              </Step>
              <Step progress={scrollYProgress} index={2} still={reduce}>
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Target className="size-3.5 text-primary" />
                    {card.daily}
                  </span>
                  <span className="font-mono font-semibold">{card.dailyValue}</span>
                </div>
              </Step>
              <Step progress={scrollYProgress} index={3} still={reduce}>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <ClipboardCheck className="size-3.5" />
                  {card.plan}
                </div>
              </Step>
            </motion.div>

            <span aria-hidden className="landing-float absolute top-6 left-0 hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:flex">
              <Flame className="size-3.5 text-primary" />
              {landing.demoLabel}
            </span>
          </div>
        </div>

        <div className="lg:order-1">
          <SectionTitle id="landing-nutrition-title" eyebrow={nutrition.eyebrow} title={nutrition.title} body={nutrition.body} />
          <PointList points={nutrition.points} />
          <p className="mt-8 max-w-md text-xs leading-relaxed text-muted-foreground/80">{nutrition.disclaimer}</p>
        </div>
      </LandingContainer>
    </section>
  );
}

const STEP_SPAN = 0.22;

function Step({
  progress,
  index,
  still,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  still: boolean | null;
  children: ReactNode;
}) {
  const start = index * STEP_SPAN;
  const opacity = useTransform(progress, [start, start + 0.14], still ? [1, 1] : [0.08, 1]);
  const y = useTransform(progress, [start, start + 0.14], still ? [0, 0] : [12, 0]);
  return <motion.div style={{ opacity, y }}>{children}</motion.div>;
}

function MacroBar({ progress, share, still }: { progress: MotionValue<number>; share: number; still: boolean | null }) {
  const scaleX = useTransform(progress, [STEP_SPAN, STEP_SPAN + 0.2], still ? [1, 1] : [0, 1]);
  return (
    <motion.div className="h-full origin-left rounded-full bg-primary" style={{ width: `${share * 100}%`, scaleX }} />
  );
}
