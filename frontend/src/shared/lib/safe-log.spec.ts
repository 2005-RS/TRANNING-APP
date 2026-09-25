import { afterEach, describe, expect, it, vi } from 'vitest';
import { logDevError } from '@/shared/lib/safe-log';

describe('logDevError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not print bearer tokens or signed URLs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logDevError(new Error('Authorization: Bearer eyJhbGciOi.secret'));
    logDevError('https://signed.example.test/photo?X-Amz-Signature=abc');
    const printed = spy.mock.calls.flat().join(' ');
    expect(printed).not.toMatch(/Bearer /);
    expect(printed).not.toMatch(/eyJhbGciOi/);
    expect(printed).not.toMatch(/X-Amz-Signature/);
    expect(printed).not.toMatch(/signed\.example\.test/);
  });
});
