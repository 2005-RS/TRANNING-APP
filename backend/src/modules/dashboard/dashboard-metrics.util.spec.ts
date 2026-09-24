import { BadRequestException } from '@nestjs/common';
import {
  clientDisplayName,
  isDashboardInactivityDays,
  isDashboardPeriodDays,
  metricDelta,
  requireInactivityDays,
  requirePeriodDays,
  toCount,
} from './dashboard-metrics.util';

describe('dashboard-metrics.util', () => {
  it('maps PostgreSQL bigint/numeric strings to numbers and truncates counts', () => {
    expect(toCount('12')).toBe(12);
    expect(toCount(12)).toBe(12);
    expect(toCount('12.9')).toBe(12);
    expect(toCount(null)).toBe(0);
  });

  it('calculates factual weight delta only when both values exist', () => {
    expect(metricDelta(82.2, 83.0)).toBe(-0.8);
    expect(metricDelta(83.0, 82.2)).toBe(0.8);
    expect(metricDelta(82.2, null)).toBeNull();
    expect(metricDelta(null, 83.0)).toBeNull();
    expect(metricDelta(undefined, 83.0)).toBeNull();
  });

  it('allowlists periodDays and inactivityDays', () => {
    expect(isDashboardPeriodDays(7)).toBe(true);
    expect(isDashboardPeriodDays(30)).toBe(true);
    expect(isDashboardPeriodDays(90)).toBe(true);
    expect(isDashboardPeriodDays(14)).toBe(false);
    expect(isDashboardPeriodDays(10000)).toBe(false);
    expect(isDashboardInactivityDays(7)).toBe(true);
    expect(isDashboardInactivityDays(14)).toBe(true);
    expect(isDashboardInactivityDays(30)).toBe(true);
    expect(isDashboardInactivityDays(90)).toBe(false);
    expect(requirePeriodDays(undefined)).toBe(30);
    expect(requireInactivityDays(undefined)).toBe(7);
    expect(() => requirePeriodDays(15)).toThrow(BadRequestException);
    expect(() => requireInactivityDays(9)).toThrow(BadRequestException);
  });

  it('builds a display name from firstName and lastName only', () => {
    expect(clientDisplayName('Cara', 'Client')).toBe('Cara Client');
  });
});
