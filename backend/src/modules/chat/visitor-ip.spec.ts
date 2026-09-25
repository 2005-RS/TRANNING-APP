import { resolveVisitorIp } from './visitor-ip';

describe('resolveVisitorIp', () => {
  it('uses the socket address and strips the IPv4-mapped prefix', () => {
    expect(
      resolveVisitorIp({ address: '::ffff:192.0.2.10', headers: {} }, false),
    ).toBe('192.0.2.10');
  });

  it('ignores X-Forwarded-For without a trusted proxy', () => {
    expect(
      resolveVisitorIp(
        { address: '10.0.0.1', headers: { 'x-forwarded-for': '6.6.6.6' } },
        false,
      ),
    ).toBe('10.0.0.1');
  });

  it('takes the right-most hop behind one trusted proxy', () => {
    expect(
      resolveVisitorIp(
        {
          address: '10.0.0.1',
          headers: { 'x-forwarded-for': 'spoofed, 198.51.100.4' },
        },
        true,
      ),
    ).toBe('198.51.100.4');
  });

  it('falls back to the socket address when the header is empty', () => {
    expect(
      resolveVisitorIp(
        { address: '10.0.0.1', headers: { 'x-forwarded-for': ' ' } },
        true,
      ),
    ).toBe('10.0.0.1');
  });
});
