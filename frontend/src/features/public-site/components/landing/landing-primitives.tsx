import { useEffect, useRef, type ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';
import { LANDING_ENTER, useReducedMotion } from './landing-motion';

export function LandingContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10', className)}>{children}</div>;
}

/** Enters once when it scrolls into view (opacity + transform only). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li';
}) {
  const reduce = useReducedMotion();
  const Component = as === 'li' ? motion.li : motion.div;
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...LANDING_ENTER, delay: reduce ? 0 : delay }}
    >
      {children}
    </Component>
  );
}

/** Eyebrow + two-line display title (second line in orange) + optional body. */
export function SectionTitle({
  id,
  eyebrow,
  title,
  body,
  className,
  align = 'left',
}: {
  id?: string;
  eyebrow: string;
  title: readonly string[];
  body?: string;
  className?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Reveal className={cn(align === 'center' && 'mx-auto text-center', className)}>
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 id={id} className="landing-display mt-4 text-[clamp(2.4rem,6vw,5rem)] text-balance text-foreground">
        {title.map((line, index) => (
          <span key={line} className={cn('block', index === title.length - 1 && title.length > 1 && 'text-primary')}>
            {line}
          </span>
        ))}
      </h2>
      {body ? (
        <p
          className={cn(
            'mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg',
            align === 'center' && 'mx-auto',
          )}
        >
          {body}
        </p>
      ) : null}
    </Reveal>
  );
}

export function CtaLink({
  to,
  hash,
  children,
  variant = 'primary',
  className,
}: {
  to: LinkProps['to'];
  hash?: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className={cn(
        buttonVariants({ size: 'lg', variant: variant === 'primary' ? 'default' : 'outline' }),
        'h-12 rounded-full px-6 text-sm font-semibold tracking-wide uppercase',
        variant === 'primary' ? 'landing-cta' : 'border-white/20 bg-white/[0.03] hover:bg-white/[0.08]',
        className,
      )}
    >
      {children}
      {variant === 'primary' ? <ArrowRight className="size-4" aria-hidden /> : null}
    </Link>
  );
}

/** Numbered list of checks used under section copy. */
export function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-8 space-y-3">
      {points.map((point, index) => (
        <Reveal as="li" key={point} delay={0.08 * index} y={12} className="flex items-center gap-3 text-sm sm:text-base">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[10px] text-primary">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-foreground/90">{point}</span>
        </Reveal>
      ))}
    </ul>
  );
}

/**
 * Counts up once, the first time it is seen. The value lives in a MotionValue,
 * so the count never re-renders React; reduced motion shows the final value.
 */
export function Counter({
  to,
  decimals = 0,
  suffix = '',
  className,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useMotionValue(reduce ? to : 0);
  const text = useTransform(value, (v) =>
    `${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`,
  );

  useEffect(() => {
    if (reduce) {
      value.set(to);
      return;
    }
    if (!inView) return;
    const controls = animate(value, to, { duration: 1.4, ease: LANDING_ENTER.ease });
    return () => controls.stop();
  }, [inView, reduce, to, value]);

  return (
    <motion.span ref={ref} className={cn('tabular-nums', className)}>
      {text}
    </motion.span>
  );
}
