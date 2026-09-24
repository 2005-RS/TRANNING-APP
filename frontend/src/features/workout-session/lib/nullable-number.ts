/**
 * Orval types some nullable numeric set fields as `{ [key: string]: unknown } | null`
 * because the OpenAPI schema models a nullable number. Runtime JSON is a number
 * or null. Do not edit generated files; normalize at this boundary.
 */
export function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

export function finiteOrZero(value: unknown): number {
  return normalizeNullableNumber(value) ?? 0;
}
