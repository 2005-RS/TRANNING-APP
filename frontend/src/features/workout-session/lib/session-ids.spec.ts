import { describe, expect, it } from 'vitest';
import { isUuid } from '@/features/workout-session/lib/session-ids';
import { SESSION_ID } from '@/features/workout-session/tests/fixtures';

describe('session ids', () => {
  it('accepts UUID session ids and rejects path noise', () => {
    expect(isUuid(SESSION_ID)).toBe(true);
    expect(isUuid('not-a-session')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
