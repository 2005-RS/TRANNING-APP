#!/usr/bin/env node
// Prints the CSP `script-src` hashes for the inline theme script in index.html.
// Two values: LF (Linux CI / production builds) and CRLF (Windows checkouts with
// core.autocrlf=true). Both must be listed in frontend/docker/nginx.conf.template
// and docker/local/nginx.local.conf.template. See docs/frontend/security-review.md.
//
//   node scripts/csp-hash.mjs
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexHtml = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const match = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/.exec(indexHtml);

if (!match) {
  console.error('No inline <script> found in index.html.');
  process.exit(1);
}

const body = match[1];
const variants = {
  LF: body.replace(/\r\n/g, '\n'),
  CRLF: body.replace(/\r?\n/g, '\r\n'),
};

for (const [label, content] of Object.entries(variants)) {
  const hash = createHash('sha256').update(content).digest('base64');
  console.log(`${label.padEnd(4)} 'sha256-${hash}'`);
}
