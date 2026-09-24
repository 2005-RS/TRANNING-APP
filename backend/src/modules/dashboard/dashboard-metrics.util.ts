import { BadRequestException } from '@nestjs/common';
import {
  toCount,
  toMetricNumber,
  toNullableMetricNumber,
} from '../progress/progress-metrics.util';
import {
  DASHBOARD_DEFAULT_INACTIVITY_DAYS,
  DASHBOARD_DEFAULT_PERIOD_DAYS,
  DASHBOARD_INACTIVITY_DAYS,
  DASHBOARD_PERIOD_DAYS,
  DashboardInactivityDays,
  DashboardPeriodDays,
} from './dashboard.constants';

export { toCount, toMetricNumber, toNullableMetricNumber };

export function isDashboardPeriodDays(
  value: number,
): value is DashboardPeriodDays {
  return (DASHBOARD_PERIOD_DAYS as readonly number[]).includes(value);
}

export function isDashboardInactivityDays(
  value: number,
): value is DashboardInactivityDays {
  return (DASHBOARD_INACTIVITY_DAYS as readonly number[]).includes(value);
}

export function requirePeriodDays(
  value: number | undefined,
): DashboardPeriodDays {
  const periodDays = value ?? DASHBOARD_DEFAULT_PERIOD_DAYS;
  if (!isDashboardPeriodDays(periodDays)) {
    throw new BadRequestException('periodDays must be 7, 30, or 90');
  }
  return periodDays;
}

export function requireInactivityDays(
  value: number | undefined,
): DashboardInactivityDays {
  const inactivityDays = value ?? DASHBOARD_DEFAULT_INACTIVITY_DAYS;
  if (!isDashboardInactivityDays(inactivityDays)) {
    throw new BadRequestException('inactivityDays must be 7, 14, or 30');
  }
  return inactivityDays;
}

/**
 * Delta is calculated only when both values exist.
 * Sign is factual (later − earlier). Gain/loss is not labeled good or bad.
 */
export function metricDelta(
  latest: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  const current = toNullableMetricNumber(latest);
  const prior = toNullableMetricNumber(previous);
  if (current === null || prior === null) {
    return null;
  }
  return toMetricNumber(current - prior);
}

export function clientDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
