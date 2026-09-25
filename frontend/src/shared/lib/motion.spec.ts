import { describe, expect, it } from 'vitest';
import {
  MOTION_DURATION_S,
  motionTransition,
  revealHidden,
  revealVisible,
} from '@/shared/lib/motion';

describe('motion helpers', () => {
  it('maps tokens to tokenized durations', () => {
    expect(motionTransition('instant', false).duration).toBe(MOTION_DURATION_S.instant);
    expect(motionTransition('fast', false).duration).toBe(MOTION_DURATION_S.fast);
    expect(motionTransition('panel', false).duration).toBe(MOTION_DURATION_S.panel);
  });

  it('collapses duration when reduced motion is requested', () => {
    expect(motionTransition('panel', true).duration).toBe(0);
    expect(revealHidden(true)).toBe(false);
  });

  it('keeps a small opacity and Y reveal when motion is allowed', () => {
    expect(revealHidden(false)).toEqual({ opacity: 0, y: 6 });
    expect(revealVisible).toEqual({ opacity: 1, y: 0 });
  });
});
