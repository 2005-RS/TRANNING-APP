import { describe, expect, it } from 'vitest';
import {
  formatCompactNumber,
  formatDurationSeconds,
  formatIsoDate,
  formatKg,
  formatPlanDateRange,
  formatSignedChange,
} from '@/features/client-dashboard/lib/formatters';

describe('dashboard formatters', () => {
  it('formats durations without inventing values', () => {
    expect(formatDurationSeconds(0)).toBe('0 min');
    expect(formatDurationSeconds(45)).toBe('45 sec');
    expect(formatDurationSeconds(60)).toBe('1 min');
    expect(formatDurationSeconds(3720)).toBe('1h 2m');
    expect(formatDurationSeconds(Number.NaN)).toBeNull();
  });

  it('formats mass and signed change with kg', () => {
    expect(formatKg(82.4)).toBe('82.4 kg');
    expect(formatSignedChange(-0.4, 'kg')).toBe('−0.4 kg');
    expect(formatSignedChange(0, 'kg')).toBe('0 kg');
    expect(formatCompactNumber(18450)).toBe('18450');
  });

  it('returns null for invalid ISO dates', () => {
    expect(formatIsoDate('not-a-date')).toBeNull();
    expect(formatIsoDate('2026-09-01T12:00:00.000Z')).not.toBeNull();
    expect(formatPlanDateRange(null, null)).toBeNull();
    expect(formatPlanDateRange('2026-09-01', '2026-10-12')).toContain('2026');
  });
});
