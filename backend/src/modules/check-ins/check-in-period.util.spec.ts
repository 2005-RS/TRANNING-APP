import { BadRequestException } from '@nestjs/common';
import { assertCheckInPeriod } from './check-in-period.util';

describe('assertCheckInPeriod', () => {
  it('accepts the 31-day exclusive-difference boundary', () => {
    expect(() => assertCheckInPeriod('2026-08-01', '2026-09-01')).not.toThrow();
  });

  it('rejects periods longer than 31 days', () => {
    expect(() => assertCheckInPeriod('2026-08-01', '2026-09-02')).toThrow(
      BadRequestException,
    );
  });

  it('rejects periodEnd before periodStart', () => {
    expect(() => assertCheckInPeriod('2026-08-30', '2026-08-24')).toThrow(
      BadRequestException,
    );
  });
});
