import { normalizeEmail } from './email.util';

describe('normalizeEmail', () => {
  it('lowercases and trims email addresses', () => {
    expect(normalizeEmail('  User@Example.com ')).toBe('user@example.com');
  });
});
