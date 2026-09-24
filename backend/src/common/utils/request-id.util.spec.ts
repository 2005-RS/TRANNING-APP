import { isSafeRequestId } from './request-id.util';

describe('isSafeRequestId', () => {
  it('accepts a UUID v4', () => {
    expect(isSafeRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects arbitrary incoming identifiers', () => {
    expect(isSafeRequestId('not-a-uuid')).toBe(false);
    expect(isSafeRequestId('../../../etc/passwd')).toBe(false);
    expect(isSafeRequestId('')).toBe(false);
    expect(isSafeRequestId(undefined)).toBe(false);
  });
});
