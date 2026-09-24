import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import {
  OpenApiIdentityError,
  fetchTrainingOpenApiDocument,
  formatIdentityFailure,
  normalizeApiOrigin,
  openApiDocumentUrl,
} from './scripts/openapi-identity.mjs';
import { TRAINING_DEV_PORT, TRAINING_PREVIEW_PORT } from './scripts/local-ports.mjs';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

/**
 * Dev-only: refuse to serve against a foreign API (for example another local
 * project on the same port). An unreachable API only warns, because starting
 * the frontend before the backend is a normal workflow.
 */
function trainingApiIdentityCheck(apiOrigin: string): Plugin {
  return {
    name: 'training-api-identity-check',
    apply: 'serve',
    async configureServer(server) {
      const url = openApiDocumentUrl(apiOrigin);
      try {
        const { identity } = await fetchTrainingOpenApiDocument(url, { timeoutMs: 3_000 });
        server.config.logger.info(`  Training API verified: "${identity.title}" at ${apiOrigin}`);
      } catch (error) {
        const reachedForeignApi =
          error instanceof OpenApiIdentityError && error.receivedTitle !== undefined;
        if (reachedForeignApi) {
          server.config.logger.error(`\n${formatIdentityFailure(error)}\n\nDev server stopped. Fix VITE_API_URL.\n`);
          await server.close();
          process.exit(1);
        }
        server.config.logger.warn(
          `\n  Training API not verified at ${url}: ${error instanceof Error ? error.message : String(error)}\n` +
            '  Start the Training backend or fix VITE_API_URL. API calls will fail until then.\n',
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  let apiOrigin: string;
  try {
    apiOrigin = normalizeApiOrigin(env.VITE_API_URL);
  } catch (error) {
    throw new Error(
      `Training App frontend: ${error instanceof Error ? error.message : String(error)} ` +
        'Copy frontend/.env.example to frontend/.env and set VITE_API_URL to the Training backend origin.',
    );
  }

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { target: '19' }]],
        },
      }),
      tailwindcss(),
      trainingApiIdentityCheck(apiOrigin),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      port: TRAINING_DEV_PORT,
      strictPort: true,
    },
    preview: {
      port: TRAINING_PREVIEW_PORT,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
