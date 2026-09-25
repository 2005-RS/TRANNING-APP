import type { IncomingHttpHeaders } from 'node:http';

function normalize(address: string): string {
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

/**
 * Mirrors Express `trust proxy = 1`: behind one trusted proxy the client is the
 * right-most X-Forwarded-For entry (the one that proxy appended). Without a
 * trusted proxy the header is attacker-controlled and ignored.
 */
export function resolveVisitorIp(
  handshake: { address: string; headers: IncomingHttpHeaders },
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const header = handshake.headers['x-forwarded-for'];
    const raw = Array.isArray(header) ? header.join(',') : header;
    const hops = (raw ?? '')
      .split(',')
      .map((hop) => hop.trim())
      .filter((hop) => hop.length > 0);
    const client = hops[hops.length - 1];
    if (client) {
      return normalize(client);
    }
  }
  return normalize(handshake.address || 'unknown');
}
