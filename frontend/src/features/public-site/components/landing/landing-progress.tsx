import { useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import { Counter, LandingContainer, Reveal, SectionTitle } from './landing-primitives';
import { LANDING_ENTER, useReducedMotion } from './landing-motion';

/** Sample strength trend (kg), one point per two weeks. */
const TREND = [92, 95, 94, 99, 101, 104, 103, 108, 112];
const CHART = { width: 560, height: 220, pad: 16 } as const;

function trendPath() {
  const min = Math.min(...TREND) - 4;
  const max = Math.max(...TREND) + 2;
  const step = (CHART.width - CHART.pad * 2) / (TREND.length - 1);
  const points = TREND.map((value, index) => {
    const x = CHART.pad + index * step;
    const y = CHART.pad + (1 - (value - min) / (max - min)) * (CHART.height - CHART.pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1] ?? [0, 0];
  const area = `${line} L${last[0].toFixed(1)} ${CHART.height} L${CHART.pad} ${CHART.height} Z`;
  return { line, area, last };
}

const { line: LINE, area: AREA, last: LAST } = trendPath();

/**
 * "Measure your progress". Everything draws once when it first enters the
 * viewport — the line, the bars and the counters — and then stays still.
 */
export function LandingProgress() {
  const { landing } = usePublicSiteCopy();
  const { progress } = landing;
  const reduce = useReducedMotion();
  const chartRef = useRef<HTMLDivElement>(null);
  const inView = useInView(chartRef, { once: true, amount: 0.45 });
  const drawn = reduce || inView;

  const bars = [
    { key: 'adherence', label: progress.bars.adherence, value: 86, suffix: '%', share: 0.86 },
    { key: 'sessions', label: progress.bars.sessions, value: 4, suffix: ' / 5', share: 0.8 },
    { key: 'checkIn', label: progress.bars.checkIn, value: 1, suffix: ' / 1', share: 1 },
  ] as const;

  return (
    <section id="progreso" aria-labelledby="landing-progress-title" className="relative scroll-mt-16 overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="landing-glow top-10 left-1/2 size-[50rem] -translate-x-1/2 opacity-40" />
      <LandingContainer className="relative">
        <SectionTitle id="landing-progress-title" eyebrow={progress.eyebrow} title={progress.title} body={progress.body} />

        <div ref={chartRef} aria-hidden className="mt-14 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="landing-float rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{progress.chartTitle}</p>
                <p className="mt-2 font-mono text-4xl font-bold sm:text-5xl">
                  <Counter to={112} suffix=" kg" />
                </p>
              </div>
              <p className="rounded-full bg-primary/15 px-3 py-1 font-mono text-sm text-primary">
                +<Counter to={20} suffix=" kg" />
              </p>
            </div>
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="mt-6 w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="landing-trend-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((fraction) => (
                <line
                  key={fraction}
                  x1="0"
                  x2={CHART.width}
                  y1={CHART.height * fraction}
                  y2={CHART.height * fraction}
                  className="stroke-white/8"
                  strokeDasharray="4 6"
                />
              ))}
              <motion.path
                d={AREA}
                fill="url(#landing-trend-fill)"
                initial={reduce ? false : { opacity: 0 }}
                animate={drawn ? { opacity: 1 } : undefined}
                transition={{ duration: 0.8, delay: reduce ? 0 : 0.9 }}
              />
              <motion.path
                d={LINE}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-primary"
                initial={reduce ? false : { pathLength: 0 }}
                animate={drawn ? { pathLength: 1 } : undefined}
                transition={{ duration: 1.6, ease: LANDING_ENTER.ease }}
              />
              <motion.circle
                cx={LAST[0]}
                cy={LAST[1]}
                r="6"
                className="fill-primary"
                initial={reduce ? false : { scale: 0 }}
                animate={drawn ? { scale: 1 } : undefined}
                transition={{ duration: 0.4, delay: reduce ? 0 : 1.5 }}
              />
            </svg>
          </div>

          <div className="grid gap-4">
            <div className="landing-float space-y-5 rounded-3xl p-6">
              {bars.map((bar, index) => (
                <div key={bar.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <Counter to={bar.value} suffix={bar.suffix} className="font-mono font-semibold" />
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full origin-left rounded-full bg-primary"
                      style={{ width: `${bar.share * 100}%` }}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={drawn ? { scaleX: 1 } : undefined}
                      transition={{ ...LANDING_ENTER, duration: 1.1, delay: reduce ? 0 : 0.3 + index * 0.12 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Reveal delay={0.2} className="landing-float flex items-start gap-4 rounded-3xl p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MessageSquareText className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{progress.checkInTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{progress.checkInBody}</p>
              </div>
            </Reveal>
          </div>
        </div>
        <p className="mt-6 text-[11px] tracking-wider text-muted-foreground/70 uppercase">{landing.demoLabel}</p>
      </LandingContainer>
    </section>
  );
}
