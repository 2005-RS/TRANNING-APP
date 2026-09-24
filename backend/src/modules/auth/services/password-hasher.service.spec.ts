import {
  ARGON2_MEMORY_COST_KIB,
  ARGON2_PARALLELISM,
  ARGON2_TIME_COST,
} from '../auth.constants';
import {
  PasswordHasherService,
  UNKNOWN_USER_TIMING_HASH,
} from './password-hasher.service';

describe('PasswordHasherService', () => {
  const hasher = new PasswordHasherService();
  const password = 'correct horse battery';

  it('never stores plaintext and verifies the correct password', async () => {
    const hash = await hasher.hash(password);

    expect(hash).not.toContain(password);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(hasher.verify(hash, password)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hasher.hash(password);
    await expect(hasher.verify(hash, 'incorrect horse battery')).resolves.toBe(
      false,
    );
  });

  it('keeps the unknown-user timing hash aligned with Argon2id parameters', () => {
    expect(UNKNOWN_USER_TIMING_HASH.startsWith('$argon2id$')).toBe(true);
    expect(UNKNOWN_USER_TIMING_HASH).toContain(`m=${ARGON2_MEMORY_COST_KIB}`);
    expect(UNKNOWN_USER_TIMING_HASH).toContain(`t=${ARGON2_TIME_COST}`);
    expect(UNKNOWN_USER_TIMING_HASH).toContain(`p=${ARGON2_PARALLELISM}`);
  });

  it('runs Argon2 verification for unknown-user logins', async () => {
    await expect(hasher.verifyUnknownUser(password)).resolves.toBe(false);
  });
});
