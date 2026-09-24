import { assertPasswordPolicy } from './password.policy';

describe('assertPasswordPolicy', () => {
  it('accepts a passphrase of at least 12 characters', () => {
    expect(assertPasswordPolicy('correct horse')).toBeNull();
  });

  it('rejects passwords shorter than 12 characters', () => {
    expect(assertPasswordPolicy('short-pass')).toContain('at least 12');
  });

  it('rejects passwords longer than 128 characters', () => {
    expect(assertPasswordPolicy('a'.repeat(129))).toContain('at most 128');
  });
});
