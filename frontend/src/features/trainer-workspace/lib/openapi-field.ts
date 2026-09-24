/**
 * Orval types some OpenAPI scalars and nullables as `{ [key: string]: unknown }`.
 * Runtime still sends numbers, strings, or null. Cast only at mutation boundaries.
 */
export function asOpenApiField<T>(value: unknown): T {
  return value as T;
}
