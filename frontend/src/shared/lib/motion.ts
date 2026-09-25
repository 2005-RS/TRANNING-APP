import { useReducedMotion, type Transition } from 'motion/react';

export { useReducedMotion };

export const MOTION_DURATION_S = {
  instant: 0.12,
  fast: 0.18,
  panel: 0.26,
} as const;

export const MOTION_DURATION_MS = {
  instant: 120,
  fast: 180,
  panel: 260,
} as const;

export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

export type MotionDurationToken = keyof typeof MOTION_DURATION_S;

export function motionTransition(
  token: MotionDurationToken,
  reduceMotion: boolean | null | undefined,
): Transition {
  return {
    duration: reduceMotion ? 0 : MOTION_DURATION_S[token],
    ease: MOTION_EASE,
  };
}

export function revealHidden(reduceMotion: boolean | null | undefined) {
  return reduceMotion ? false : { opacity: 0, y: 6 };
}

export const revealVisible = { opacity: 1, y: 0 } as const;
