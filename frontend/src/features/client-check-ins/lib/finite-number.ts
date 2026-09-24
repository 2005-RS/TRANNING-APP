/** Keep finite numbers, including 0. Everything else is absence. */
export function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
