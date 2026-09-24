/**
 * Percent change from a previous value to a current value.
 * Zero is a valid measurement. Null / non-finite is absence.
 * Division by zero returns null (never NaN or Infinity).
 */
export function percentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null) {
    return null;
  }
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  const result = ((current - previous) / Math.abs(previous)) * 100;
  return Number.isFinite(result) ? result : null;
}

export function absoluteChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null) {
    return null;
  }
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  return current - previous;
}
