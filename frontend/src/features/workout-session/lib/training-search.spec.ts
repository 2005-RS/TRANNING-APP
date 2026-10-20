import { describe, expect, it } from 'vitest';
import { isTrainingTab } from '@/features/workout-session/lib/training-search';

describe('isTrainingTab', () => {
  it.each(['plan', 'library', 'history'])('accepts %s', (value) => {
    expect(isTrainingTab(value)).toBe(true);
  });

  it.each([undefined, 'invalid', 1])('rejects invalid values', (value) => {
    expect(isTrainingTab(value)).toBe(false);
  });
});
