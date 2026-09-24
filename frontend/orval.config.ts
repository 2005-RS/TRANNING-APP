import { defineConfig } from 'orval';

// Set only by scripts/api-generate.mjs after the OpenAPI identity guard passes.
// Orval must never fetch a live URL itself: `clean: true` wipes the output
// before generation, and an unverified source may belong to another project.
const snapshot = process.env.TRAINING_OPENAPI_SNAPSHOT;
const outputDir = process.env.TRAINING_OPENAPI_OUTPUT_DIR;

if (!snapshot || !outputDir) {
  throw new Error(
    'Run `npm run api:generate`. Orval is only invoked by the guarded generator, which verifies the Training App OpenAPI identity first.',
  );
}

export default defineConfig({
  api: {
    input: {
      target: snapshot,
    },
    output: {
      mode: 'tags-split',
      target: `${outputDir}/api.ts`,
      schemas: `${outputDir}/models`,
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: false,
      tsconfig: './tsconfig.app.json',
      override: {
        mutator: {
          path: './src/shared/lib/api-mutator.ts',
          name: 'apiFetch',
        },
        fetch: {
          // Mutator returns JSON (or undefined for 204), not { data, status, headers }.
          includeHttpResponseReturnType: false,
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
