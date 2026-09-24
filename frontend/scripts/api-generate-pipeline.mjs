import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fetchTrainingOpenApiDocument, openApiDocumentUrl } from './openapi-identity.mjs';

export class GenerationStepError extends Error {
  /** @param {string} message @param {unknown} [cause] */
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'GenerationStepError';
  }
}

/**
 * Staging must sit beside `src/generated` (same depth) so Orval computes the
 * same relative mutator import paths it would for the real output.
 * @param {string} frontendDir
 */
export function defaultGenerationPaths(frontendDir) {
  const cacheDir = path.join(frontendDir, 'node_modules', '.cache', 'training-api-generate');
  return {
    generatedDir: path.join(frontendDir, 'src', 'generated'),
    stagingDir: path.join(frontendDir, 'src', '.generated-staging'),
    backupDir: path.join(cacheDir, 'generated-previous'),
    snapshotPath: path.join(cacheDir, 'openapi.json'),
  };
}

/**
 * Runs the Orval CLI against a validated local snapshot.
 * @param {{ frontendDir: string; snapshotPath: string; outputDir: string }} options
 */
export function runOrvalCli({ frontendDir, snapshotPath, outputDir }) {
  const require = createRequire(path.join(frontendDir, 'package.json'));
  const orvalBin = path.join(path.dirname(require.resolve('orval')), 'bin', 'orval.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [orvalBin, '--config', 'orval.config.ts'], {
      cwd: frontendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TRAINING_OPENAPI_SNAPSHOT: snapshotPath,
        TRAINING_OPENAPI_OUTPUT_DIR: path.relative(frontendDir, outputDir).split(path.sep).join('/'),
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`Orval exited with code ${code}`))));
  });
}

/** @param {string} dir */
async function assertGeneratedOutput(dir) {
  const entries = await readdir(dir, { recursive: true }).catch(() => []);
  const tsFiles = entries.filter((entry) => String(entry).endsWith('.ts'));
  const hasModels = entries.some((entry) => String(entry) === 'models');
  if (tsFiles.length === 0 || !hasModels) {
    throw new GenerationStepError(`Orval produced no usable client in ${dir}.`);
  }
  return tsFiles.length;
}

/** Windows can briefly lock directories watched by editors or dev servers. */
async function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = /** @type {NodeJS.ErrnoException} */ (error).code;
      if (attempt >= 5 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}

/** Replaces `generatedDir` with `stagingDir`, restoring the original on failure. */
async function swapIntoPlace(stagingDir, generatedDir, backupDir) {
  await rm(backupDir, { recursive: true, force: true });
  await mkdir(path.dirname(backupDir), { recursive: true });
  let backedUp = false;
  try {
    await renameWithRetry(generatedDir, backupDir);
    backedUp = true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') {
      throw new GenerationStepError('Could not move the existing generated client aside.', error);
    }
  }
  try {
    await renameWithRetry(stagingDir, generatedDir);
  } catch (error) {
    if (backedUp) {
      await renameWithRetry(backupDir, generatedDir);
    }
    throw new GenerationStepError('Could not install the new generated client; the previous client was restored.', error);
  }
  await rm(backupDir, { recursive: true, force: true });
}

/**
 * resolve origin → fetch → validate identity → snapshot → Orval into staging →
 * verify output → swap. Nothing under `generatedDir` is touched unless every
 * earlier step succeeded.
 *
 * @param {{
 *   origin: string;
 *   paths: ReturnType<typeof defaultGenerationPaths>;
 *   runOrval: (options: { snapshotPath: string; outputDir: string }) => Promise<unknown>;
 *   fetchImpl?: typeof fetch;
 * }} options
 */
export async function runGuardedGeneration({ origin, paths, runOrval, fetchImpl }) {
  const url = openApiDocumentUrl(origin);
  const { text, identity } = await fetchTrainingOpenApiDocument(url, { fetchImpl });

  await mkdir(path.dirname(paths.snapshotPath), { recursive: true });
  await writeFile(paths.snapshotPath, text, 'utf8');
  await rm(paths.stagingDir, { recursive: true, force: true });
  try {
    try {
      await runOrval({ snapshotPath: paths.snapshotPath, outputDir: paths.stagingDir });
    } catch (error) {
      throw new GenerationStepError('Orval failed while generating into the staging directory.', error);
    }
    const fileCount = await assertGeneratedOutput(paths.stagingDir);
    await swapIntoPlace(paths.stagingDir, paths.generatedDir, paths.backupDir);
    return { url, identity, fileCount };
  } finally {
    await rm(paths.stagingDir, { recursive: true, force: true });
  }
}
