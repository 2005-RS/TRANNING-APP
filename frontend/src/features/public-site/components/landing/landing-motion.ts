import { useEffect, useState, type RefObject } from 'react';
import { useScroll, useTransform } from 'motion/react';
import { MOTION_EASE, useReducedMotion } from '@/shared/lib/motion';

export { MOTION_EASE, useReducedMotion };

/** Entrance timing for the landing: the app's easing, a little slower. */
export const LANDING_ENTER = { duration: 0.7, ease: MOTION_EASE } as const;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Sticky storytelling and heavy parallax are desktop-only. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Pointer effects only for a real mouse on desktop, never with reduced motion. */
export function usePointerEffects(): boolean {
  const fine = useMediaQuery('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  const reduce = useReducedMotion();
  return fine && !reduce;
}

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

/**
 * Scroll progress (0–1) of `target` through the viewport, on native scroll.
 * The function-form transform opts out of motion's ScrollTimeline hand-off:
 * an accelerated animation drops back to the element's base style outside its
 * range (a finished phase would flash back to full opacity), and it only
 * supports offsets inside [0, 1].
 */
export function useSectionProgress(target: RefObject<HTMLElement | null>, offset: ScrollOffset) {
  const { scrollYProgress } = useScroll({ target, offset });
  return useTransform(scrollYProgress, (value) => Math.min(1, Math.max(0, value)));
}
