import net from 'node:net';
import { pathToFileURL } from 'node:url';

/**
 * True when anything accepts TCP connections on `port` over IPv4 or IPv6
 * loopback. `localhost` may resolve to either, so both are probed.
 * @param {number} port
 */
export async function isPortInUse(port) {
  const probe = (host) =>
    new Promise((resolve) => {
      const socket = net.connect({ host, port });
      const done = (inUse) => {
        socket.destroy();
        resolve(inUse);
      };
      socket.setTimeout(750, () => done(false));
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
    });
  const results = await Promise.all([probe('127.0.0.1'), probe('::1')]);
  return results.some(Boolean);
}

/** @param {number} port @param {string} purpose */
export function portInUseMessage(port, purpose) {
  return [
    `${purpose} port ${port} is already in use.`,
    'Another process (possibly another local project) is listening on it.',
    'Stop that process, then re-run. The Training App never reuses or falls back from this port.',
    'Tests were not started.',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]);
  if (!Number.isInteger(port) || port <= 0) {
    console.error('Usage: node scripts/check-port.mjs <port>');
    process.exit(2);
  }
  process.exit((await isPortInUse(port)) ? 3 : 0);
}
