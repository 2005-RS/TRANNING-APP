import { describe, expect, it } from 'vitest';
import {
  parseProgressPeriod,
  previousWindow,
  utcDateKey,
  windowForPeriod,
} from '@/features/client-progress/lib/period';

describe('progress period', () => {
  it('falls back to 30 for invalid values', () => {
    expect(parseProgressPeriod('99')).toBe(30);
    expect(parseProgressPeriod(undefined)).toBe(30);
    expect(parseProgressPeriod('30')).toBe(30);
    expect(parseProgressPeriod(180)).toBe(180);
    expect(parseProgressPeriod('"30"')).toBe(30);
  });

  it('builds inclusive UTC windows', () => {
    const now = new Date('2026-09-04T18:00:00.000Z');
    expect(windowForPeriod(7, now)).toEqual({
      dateFrom: '2026-08-29',
      dateTo: '2026-09-04',
    });
    expect(windowForPeriod(30, now)).toEqual({
      dateFrom: '2026-08-06',
      dateTo: '2026-09-04',
    });
  });

  it('computes the previous equal-length window', () => {
    expect(
      previousWindow({ dateFrom: '2026-08-06', dateTo: '2026-09-04' }),
    ).toEqual({
      dateFrom: '2026-07-07',
      dateTo: '2026-08-05',
    });
  });

  it('formats UTC calendar days', () => {
    expect(utcDateKey(new Date('2026-09-04T01:00:00.000Z'))).toBe('2026-09-04');
  });
});
