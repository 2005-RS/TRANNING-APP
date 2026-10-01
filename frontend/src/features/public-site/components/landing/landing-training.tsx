import { useRef, type ReactNode } from 'react';
import { CheckCircle2, Dumbbell } from 'lucide-react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { LandingContainer, PointList, SectionTitle } from './landing-primitives';
import { useReducedMotion, useSectionProgress } from './landing-motion';

const LAYER_COUNT = 5;

/**
 * "Train with purpose". As the photo scrolls through the viewport, the session
 * panel builds up one layer at a time: exercise → sets × reps → weight →
 * session progress → completed. Scroll-linked, so it reverses on scroll up.
 */
export function LandingTraining() {
  const { landing } = usePublicSiteCopy();
  const { training } = landing;
  const layers = training.layers;
  const reduce = useReducedMotion();
  const visualRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = useSectionProgress(visualRef, ['start 0.85', 'end 0.55']);
  const pass = useSectionProgress(visualRef, ['start end', 'end start']);
  const photoY = useTransform(pass, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '8%']);
  const sessionScale = useTransform(scrollYProgress, [0.6, 0.78], reduce ? [1, 1] : [0, 1]);

  return (
    <section id="entrenamiento" aria-labelledby="landing-training-title" className="relative scroll-mt-16 overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="landing-glow top-1/3 -left-60 size-[40rem] opacity-50" />
      <LandingContainer className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div ref={visualRef} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border sm:aspect-[5/4] lg:aspect-[4/5]">
            <motion.img
              src="/landing/training-deadlift.webp"
              alt=""
              width={1024}
              height={683}
              loading="lazy"
              decoding="async"
              className="landing-photo absolute inset-0 h-[116%] w-full object-cover object-[35%_center]"
              style={{ y: photoY, top: '-8%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          </div>

          <div
            aria-hidden
            className="landing-float absolute right-3 bottom-3 left-3 space-y-3 rounded-2xl p-4 sm:right-auto sm:bottom-6 sm:left-6 sm:w-72 lg:-right-10 lg:left-auto lg:bottom-10"
          >
            <Layer progress={scrollYProgress} index={0} still={reduce}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Dumbbell className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] text-muted-foreground">{layers.exercise}</p>
                  <p className="text-sm font-semibold">{layers.exerciseValue}</p>
                </div>
              </div>
            </Layer>
            <div className="grid grid-cols-2 gap-2">
              <Layer progress={scrollYProgress} index={1} still={reduce}>
                <Metric label={layers.sets} value={layers.setsValue} />
              </Layer>
              <Layer progress={scrollYProgress} index={2} still={reduce}>
                <Metric label={layers.weight} value={layers.weightValue} />
              </Layer>
            </div>
            <Layer progress={scrollYProgress} index={3} still={reduce}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{layers.progress}</span>
                <span className="font-mono">{layers.progressValue}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full w-3/5 origin-left rounded-full bg-primary" style={{ scaleX: sessionScale }} />
              </div>
            </Layer>
            <Layer progress={scrollYProgress} index={4} still={reduce}>
              <div className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <CheckCircle2 className="size-4" />
                {layers.completed}
              </div>
            </Layer>
          </div>
        </div>

        <div>
          <SectionTitle id="landing-training-title" eyebrow={training.eyebrow} title={training.title} body={training.body} />
          <PointList points={training.points} />
          <p className="mt-8 text-[11px] tracking-wider text-muted-foreground/70 uppercase">{landing.demoLabel}</p>
        </div>
      </LandingContainer>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function Layer({
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
  const start = index / LAYER_COUNT;
  const end = start + 0.14;
  const opacity = useTransform(progress, [start, end], still ? [1, 1] : [0, 1]);
  const y = useTransform(progress, [start, end], still ? [0, 0] : [14, 0]);
  return <motion.div style={{ opacity, y }}>{children}</motion.div>;
}
