import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { GenerationStepError, defaultGenerationPaths, runGuardedGeneration, runOrvalCli } from './api-generate-pipeline.mjs';
import { OpenApiIdentityError, formatIdentityFailure, normalizeApiOrigin, openApiDocumentUrl } from './openapi-identity.mjs';

const frontendDir = fileURLToPath(new URL('..', import.meta.url));
const paths = defaultGenerationPaths(frontendDir);

const fromShell = Boolean(process.env.VITE_API_URL);
const env = loadEnv('development', frontendDir, 'VITE_');
let url;

try {
  const origin = normalizeApiOrigin(env.VITE_API_URL);
  url = openApiDocumentUrl(origin);
  console.log(`Training API source: ${url} (VITE_API_URL from ${fromShell ? 'shell environment' : 'frontend/.env files'})`);

  const result = await runGuardedGeneration({
    origin,
    paths,
    runOrval: ({ snapshotPath, outputDir }) => runOrvalCli({ frontendDir, snapshotPath, outputDir }),
  });

  console.log(
    `Training API verified: "${result.identity.title}" v${result.identity.version}, ${result.identity.pathCount} paths. ` +
      `Generated ${result.fileCount} files into src/generated.`,
  );
} catch (error) {
  if (error instanceof OpenApiIdentityError) {
    console.error(`\n${formatIdentityFailure(error.url ? error : Object.assign(error, { url }))}\n`);
    console.error('Generation aborted before Orval ran.\nExisting generated client was preserved.\n');
  } else if (error instanceof GenerationStepError) {
    console.error(`\nTRAINING API GENERATION FAILED\n\n${error.message}`);
    if (error.cause) {
      console.error(`Cause: ${error.cause instanceof Error ? error.cause.message : String(error.cause)}`);
    }
    console.error('\nExisting generated client was preserved.\n');
  } else {
    console.error(error);
    console.error('\nExisting generated client was preserved.\n');
  }
  process.exitCode = 1;
}
