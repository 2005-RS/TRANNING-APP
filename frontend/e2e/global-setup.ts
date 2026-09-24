import type { FullConfig } from '@playwright/test';
import { TRAINING_APP_ID } from '../scripts/local-ports.mjs';

/**
 * Runs after Playwright's webServer is ready and before any test. Supplements
 * strict port ownership: the served document must identify as Training App.
 */
export default async function verifyTrainingFrontend(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) {
    throw new Error('Training App E2E: baseURL is not configured.');
  }
  let html: string;
  try {
    const response = await fetch(baseURL, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    html = await response.text();
  } catch (error) {
    throw new Error(`Training App E2E: could not load ${baseURL}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const match = html.match(/<meta\s+name="app-id"\s+content="([^"]*)"/);
  if (match?.[1] !== TRAINING_APP_ID) {
    throw new Error(
      [
        'TRAINING FRONTEND VALIDATION FAILED',
        '',
        `Expected: app-id "${TRAINING_APP_ID}"`,
        `Received: ${match ? `app-id "${match[1]}"` : 'no app-id marker (not the Training App build)'}`,
        `URL: ${baseURL}`,
        '',
        'Tests were not started.',
      ].join('\n'),
    );
  }
}
