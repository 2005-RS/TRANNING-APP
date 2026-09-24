import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Deterministic fingerprint of a directory: SHA-256 over sorted
 * `relative/posix/path\0sha256(content)\n` lines.
 * Usage: node scripts/hash-generated.mjs [dir]   (default: src/generated)
 * @param {string} dir
 */
export async function hashDirectory(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
  const digest = createHash('sha256');
  for (const file of files) {
    const content = await readFile(path.join(dir, file));
    digest.update(`${file}\0${createHash('sha256').update(content).digest('hex')}\n`);
  }
  return { hash: digest.digest('hex'), fileCount: files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = path.resolve(process.argv[2] ?? 'src/generated');
  const { hash, fileCount } = await hashDirectory(dir);
  console.log(`${hash} files=${fileCount} dir=${path.relative(process.cwd(), dir) || '.'}`);
}
