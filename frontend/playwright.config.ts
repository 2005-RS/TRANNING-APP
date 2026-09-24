import { spawnSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';
import { portInUseMessage } from './scripts/check-port.mjs';
import { TRAINING_PREVIEW_PORT } from './scripts/local-ports.mjs';

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;

/**
 * Server ownership (fail safe):
 *
 * The suite owns a dedicated strict port and starts its own `vite preview` of
 * the Training App build. It never reuses an existing server: another local
 * project (for example SIGASJ on 5173) once satisfied the old reuse check.
 * An occupied port stops the run before any test starts, and
 * `e2e/global-setup.ts` verifies the served document is Training App.
 *
 * Workers are serialized on purpose (F05 closeout): a cold parallel start
 * could not finish several first navigations inside the 30s
 * `navigationTimeout`. Preview (the production build the gate already
 * produced) has no transform queue.
 */
const baseURL = `http://localhost:${TRAINING_PREVIEW_PORT}`;

if (!process.env.TEST_WORKER_INDEX) {
  const probe = spawnSync(process.execPath, ['scripts/check-port.mjs', String(TRAINING_PREVIEW_PORT)], {
    cwd: import.meta.dirname,
  });
  if (probe.status === 3) {
    throw new Error(`\n${portInUseMessage(TRAINING_PREVIEW_PORT, 'Training App E2E')}\n`);
  }
  if (probe.status !== 0) {
    throw new Error(`Training App E2E: could not check port ${TRAINING_PREVIEW_PORT} (${probe.error?.message ?? `exit ${probe.status}`}).`);
  }
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'node scripts/e2e-preview.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  metadata: {
    hasCredentials: Boolean(e2eEmail && e2ePassword),
  },
});
