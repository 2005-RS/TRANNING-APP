import {
  isNotFutureIsoDate,
  parseStrictIsoDate,
  toIsoDateString,
} from './iso-date.util';

describe('iso-date.util', () => {
  it('accepts valid calendar dates', () => {
    expect(parseStrictIsoDate('1994-06-15')).toEqual({
      year: 1994,
      month: 6,
      day: 15,
    });
    expect(parseStrictIsoDate('2024-02-29')).not.toBeNull();
  });

  it('rejects non YYYY-MM-DD values and invalid calendars', () => {
    expect(parseStrictIsoDate('2024-02-30')).toBeNull();
    expect(parseStrictIsoDate('2026-13-01')).toBeNull();
    expect(parseStrictIsoDate('2026-01-01T00:00:00Z')).toBeNull();
    expect(parseStrictIsoDate('01/01/2026')).toBeNull();
  });

  it('rejects future dates using UTC today', () => {
    expect(isNotFutureIsoDate('1990-01-01')).toBe(true);
    expect(isNotFutureIsoDate('2099-01-01')).toBe(false);
    expect(
      isNotFutureIsoDate('2026-09-02', new Date('2026-09-01T12:00:00.000Z')),
    ).toBe(false);
  });

  it('serializes DATE values as YYYY-MM-DD', () => {
    expect(toIsoDateString('1994-06-15')).toBe('1994-06-15');
    expect(toIsoDateString(new Date('1994-06-15T00:00:00.000Z'))).toBe(
      '1994-06-15',
    );
    expect(toIsoDateString(null)).toBeNull();
  });
});
