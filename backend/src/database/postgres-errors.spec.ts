import { QueryFailedError } from 'typeorm';
import {
  isPostgresCheckViolation,
  isPostgresForeignKeyViolation,
  isPostgresInvalidEnum,
  isPostgresUniqueViolation,
} from './postgres-errors';

describe('postgres error helpers', () => {
  it('detects PostgreSQL unique violations', () => {
    const error = new QueryFailedError('INSERT', [], {
      code: '23505',
    } as Error & { code: string });

    expect(isPostgresUniqueViolation(error)).toBe(true);
  });

  it('detects foreign-key and invalid-enum driver codes', () => {
    expect(
      isPostgresForeignKeyViolation(
        new QueryFailedError('INSERT', [], {
          code: '23503',
        } as Error & { code: string }),
      ),
    ).toBe(true);
    expect(
      isPostgresInvalidEnum(
        new QueryFailedError('INSERT', [], {
          code: '22P02',
        } as Error & { code: string }),
      ),
    ).toBe(true);
    expect(
      isPostgresCheckViolation(
        new QueryFailedError('INSERT', [], {
          code: '23514',
        } as Error & { code: string }),
      ),
    ).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isPostgresUniqueViolation(new Error('nope'))).toBe(false);
    expect(isPostgresForeignKeyViolation(new Error('nope'))).toBe(false);
    expect(isPostgresInvalidEnum(new Error('nope'))).toBe(false);
    expect(isPostgresCheckViolation(new Error('nope'))).toBe(false);
  });
});
