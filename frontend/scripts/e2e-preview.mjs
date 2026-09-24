import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRAINING_APP_ID, TRAINING_PREVIEW_PORT } from './local-ports.mjs';

/**
 * Serves the Training App production build for the canonical Playwright suite.
 * Started only by playwright.config.ts (reuseExistingServer: false).
 */
const frontendDir = fileURLToPath(new URL('..', import.meta.url));
const indexHtml = path.join(frontendDir, 'dist', 'index.html');

let html;
try {
  html = await readFile(indexHtml, 'utf8');
} catch {
  console.error(`Training App E2E: ${indexHtml} does not exist. Run \`npm run build\` first. Tests were not started.`);
  process.exit(1);
}
if (!html.includes(`<meta name="app-id" content="${TRAINING_APP_ID}"`)) {
  console.error(`Training App E2E: dist/ does not contain the Training App build (app-id "${TRAINING_APP_ID}" missing). Run \`npm run build\`.`);
  process.exit(1);
}

const require = createRequire(path.join(frontendDir, 'package.json'));
const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
const child = spawn(process.execPath, [viteBin, 'preview', '--port', String(TRAINING_PREVIEW_PORT), '--strictPort'], {
  cwd: frontendDir,
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code) => process.exit(code ?? 1));
