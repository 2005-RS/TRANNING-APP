import { parseStrictIsoDate } from '../clients/iso-date.util';
import { BadRequestException } from '@nestjs/common';

export function utcDayStart(isoDate: string): Date {
  const parsed = parseStrictIsoDate(isoDate);
  if (!parsed) {
    throw new BadRequestException('Invalid date');
  }
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

export function utcDayEndExclusive(isoDate: string): Date {
  const start = utcDayStart(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
