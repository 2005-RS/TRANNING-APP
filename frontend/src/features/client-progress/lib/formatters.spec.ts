import { describe, expect, it } from 'vitest';
import {
  formatDecimal,
  formatDurationSeconds,
  formatKg,
  formatPercent,
  formatSignedChange,
  formatVolumeKg,
} from '@/features/client-progress/lib/formatters';

describe('progress formatters', () => {
  it('formats volume and decimals without inventing values', () => {
    expect(formatVolumeKg(0)).toBe('0 kg');
    expect(formatVolumeKg(18450.4)).toBe('18450 kg');
    expect(formatDecimal(82.4)).toBe('82.4');
    expect(formatKg(81)).toBe('81 kg');
    expect(formatVolumeKg(Number.NaN)).toBeNull();
  });

  it('formats duration including zero', () => {
    expect(formatDurationSeconds(0)).toBe('0 min');
    expect(formatDurationSeconds(45)).toBe('45 sec');
    expect(formatDurationSeconds(900)).toBe('15 min');
    expect(formatDurationSeconds(Number.NaN)).toBeNull();
  });

  it('formats signed change and percent without GOOD/BAD labels', () => {
    expect(formatSignedChange(-1.4, 'kg')).toBe('−1.4 kg');
    expect(formatSignedChange(0, 'kg')).toBe('0 kg');
    expect(formatPercent(-8.3)).toBe('−8.3%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
