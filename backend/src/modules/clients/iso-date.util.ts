const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseStrictIsoDate(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function utcTodayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isNotFutureIsoDate(value: string, now = new Date()): boolean {
  return parseStrictIsoDate(value) !== null && value <= utcTodayIsoDate(now);
}

export function toIsoDateString(value: Date | string | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
