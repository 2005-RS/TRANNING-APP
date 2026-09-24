import { BadRequestException } from '@nestjs/common';
import { parseStrictIsoDate } from '../clients/iso-date.util';
import { CHECK_IN_MAX_PERIOD_DAYS } from './check-ins.constants';

export function assertCheckInPeriod(
  periodStart: string,
  periodEnd: string,
): void {
  if (periodEnd < periodStart) {
    throw new BadRequestException('periodEnd must be on or after periodStart');
  }

  const start = parseStrictIsoDate(periodStart);
  const end = parseStrictIsoDate(periodEnd);
  if (!start || !end) {
    throw new BadRequestException('Check-in period is invalid');
  }

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const days = Math.round((endUtc - startUtc) / 86_400_000);
  if (days > CHECK_IN_MAX_PERIOD_DAYS) {
    throw new BadRequestException(
      `Check-in period cannot exceed ${CHECK_IN_MAX_PERIOD_DAYS} days`,
    );
  }
}
