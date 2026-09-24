import { QueryFailedError } from 'typeorm';

function postgresDriverCode(error: unknown): string | undefined {
  if (
    !(error instanceof QueryFailedError) ||
    typeof error.driverError !== 'object' ||
    error.driverError === null ||
    !('code' in error.driverError)
  ) {
    return undefined;
  }

  return typeof error.driverError.code === 'string'
    ? error.driverError.code
    : undefined;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return postgresDriverCode(error) === '23505';
}

export function isPostgresForeignKeyViolation(error: unknown): boolean {
  return postgresDriverCode(error) === '23503';
}

export function isPostgresInvalidEnum(error: unknown): boolean {
  return postgresDriverCode(error) === '22P02';
}

export function isPostgresCheckViolation(error: unknown): boolean {
  return postgresDriverCode(error) === '23514';
}
