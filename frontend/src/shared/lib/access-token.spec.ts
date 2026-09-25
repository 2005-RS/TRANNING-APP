import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/shared/lib/access-token';

describe('access token memory', () => {
  afterEach(() => {
    clearAccessToken();
  });

  it('stores the token only in memory', () => {
    setAccessToken('access-token-value');
    expect(getAccessToken()).toBe('access-token-value');
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
    expect(JSON.stringify(window.localStorage)).not.toContain('access-token-value');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('access-token-value');
  });
});
