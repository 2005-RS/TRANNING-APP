import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGenerationPaths, runGuardedGeneration } from '../scripts/api-generate-pipeline.mjs';
import { hashDirectory } from '../scripts/hash-generated.mjs';
import {
  CANONICAL_OPERATIONS,
  EXPECTED_OPENAPI_TITLE,
  OpenApiIdentityError,
  assertTrainingOpenApiDocument,
  fetchTrainingOpenApiDocument,
  formatIdentityFailure,
  normalizeApiOrigin,
} from '../scripts/openapi-identity.mjs';

const URL_UNDER_TEST = 'http://localhost:3100/api/docs-json';

function trainingDocument() {
  const paths: Record<string, Record<string, unknown>> = {
    '/api/v1/health': { get: { operationId: 'Health_check' } },
  };
  for (const [method, route] of CANONICAL_OPERATIONS) {
    paths[route] = { ...paths[route], [method]: { operationId: `${method}_${route}` } };
  }
  return {
    openapi: '3.0.0',
    info: { title: EXPECTED_OPENAPI_TITLE, version: '1.0.0' },
    paths,
    components: { securitySchemes: { 'access-token': { type: 'http', scheme: 'bearer' } } },
  };
}

/** Shape of the real foreign document observed on this workstation. */
function foreignDocument() {
  return {
    openapi: '3.0.0',
    info: { title: 'SIGASJ API', version: '1.0.0' },
    paths: {
      '/api/v1': { get: {} },
      '/api/v1/health': { get: {} },
      '/api/v1/auth/login': { post: {} },
      '/api/v1/auth/me': { get: {} },
    },
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  };
}

function jsonFetch(body: unknown, init: { status?: number; contentType?: string } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return vi.fn<typeof fetch>(async () =>
    new Response(text, {
      status: init.status ?? 200,
      headers: { 'content-type': init.contentType ?? 'application/json; charset=utf-8' },
    }),
  );
}

async function expectIdentityFailure(promise: Promise<unknown>, pattern: RegExp) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(OpenApiIdentityError);
  expect(formatIdentityFailure(error)).toMatch(pattern);
  return error as OpenApiIdentityError;
}

describe('OpenAPI identity guard', () => {
  it('A. accepts the Training App document', async () => {
    const result = await fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch(trainingDocument()) });
    expect(result.identity).toEqual({ title: 'Training Platform API', version: '1.0.0', pathCount: CANONICAL_OPERATIONS.length + 1 });
  });

  it('B. rejects a foreign API title and reports what was received', async () => {
    const error = await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch(foreignDocument()) }),
      /TRAINING API VALIDATION FAILED[\s\S]*Received:\nSIGASJ API[\s\S]*URL:\nhttp:\/\/localhost:3100\/api\/docs-json/,
    );
    expect(error.reasons.join('\n')).toMatch(/info\.title is "SIGASJ API"/);
    expect(error.reasons.join('\n')).toMatch(/Missing canonical Training operations/);
  });

  it('C. rejects the expected title when canonical Training paths are missing', () => {
    const document = trainingDocument();
    delete document.paths['/api/v1/admin/dashboard'];
    delete document.paths['/api/v1/nutrition/foods'];
    expect(() => assertTrainingOpenApiDocument(document, URL_UNDER_TEST)).toThrow(OpenApiIdentityError);
    try {
      assertTrainingOpenApiDocument(document, URL_UNDER_TEST);
    } catch (error) {
      const reasons = (error as OpenApiIdentityError).reasons.join('\n');
      expect(reasons).toContain('GET /api/v1/admin/dashboard');
      expect(reasons).toContain('GET /api/v1/nutrition/foods');
      expect(reasons).not.toMatch(/info\.title/);
    }
  });

  it('C2. rejects a canonical path that exists with the wrong method, paths outside /api/v1, and a missing auth scheme', () => {
    const document = trainingDocument();
    document.paths['/api/v1/auth/refresh'] = { get: {} };
    document.paths['/graphql'] = { post: {} };
    document.components.securitySchemes = {} as typeof document.components.securitySchemes;
    try {
      assertTrainingOpenApiDocument(document, URL_UNDER_TEST);
      expect.unreachable();
    } catch (error) {
      const reasons = (error as OpenApiIdentityError).reasons.join('\n');
      expect(reasons).toContain('POST /api/v1/auth/refresh');
      expect(reasons).toContain('/graphql');
      expect(reasons).toContain('"access-token"');
    }
  });

  it('D. rejects HTTP failures and unreachable servers', async () => {
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch({ message: 'Not Found' }, { status: 404 }) }),
      /HTTP 404/,
    );
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch('boom', { status: 500 }) }),
      /HTTP 500/,
    );
    const refused = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });
    await expectIdentityFailure(fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: refused }), /Could not reach the Training API/);
  });

  it('E. rejects invalid JSON', async () => {
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch('{"openapi": "3.0.0", ') }),
      /not valid JSON/,
    );
  });

  it('F. rejects wrong document types', async () => {
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, {
        fetchImpl: jsonFetch('<!doctype html><title>Vite App</title>', { contentType: 'text/html' }),
      }),
      /Expected a JSON response/,
    );
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, {
        fetchImpl: jsonFetch({ swagger: '2.0', info: { title: EXPECTED_OPENAPI_TITLE }, paths: {} }),
      }),
      /Expected an OpenAPI 3\.x document, received Swagger 2\.0/,
    );
    await expectIdentityFailure(fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch([trainingDocument()]) }), /not an OpenAPI document/);
    await expectIdentityFailure(
      fetchTrainingOpenApiDocument(URL_UNDER_TEST, { fetchImpl: jsonFetch({ status: 'ok', info: { title: EXPECTED_OPENAPI_TITLE } }) }),
      /Expected an OpenAPI 3\.x document/,
    );
  });

  it('requires an explicit API origin with no default port', () => {
    expect(() => normalizeApiOrigin(undefined)).toThrow(/VITE_API_URL is not set/);
    expect(() => normalizeApiOrigin('  ')).toThrow(/VITE_API_URL is not set/);
    expect(() => normalizeApiOrigin('localhost:3000')).toThrow(OpenApiIdentityError);
    expect(() => normalizeApiOrigin('http://localhost:3000/')).toThrow(/origin only/);
    expect(() => normalizeApiOrigin('http://localhost:3000/api')).toThrow(/origin only/);
    expect(() => normalizeApiOrigin('ftp://localhost:3000')).toThrow(/http or https/);
    expect(normalizeApiOrigin('http://localhost:3100')).toBe('http://localhost:3100');
  });
});

describe('guarded generation pipeline', () => {
  let root: string;
  let paths: ReturnType<typeof defaultGenerationPaths>;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'training-guard-'));
    paths = defaultGenerationPaths(root);
    await mkdir(path.join(paths.generatedDir, 'models'), { recursive: true });
    await writeFile(path.join(paths.generatedDir, 'models', 'existing.ts'), 'export type Existing = 1;\n');
    await writeFile(path.join(paths.generatedDir, 'auth.ts'), 'export const existing = true;\n');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function fakeOrvalOutput({ outputDir }: { outputDir: string }) {
    await mkdir(path.join(outputDir, 'models'), { recursive: true });
    await writeFile(path.join(outputDir, 'models', 'fresh.ts'), 'export type Fresh = 1;\n');
    await writeFile(path.join(outputDir, 'auth.ts'), 'export const fresh = true;\n');
  }

  it('G. aborts before Orval on a foreign document and leaves the generated directory untouched', async () => {
    const before = await hashDirectory(paths.generatedDir);
    const runOrval = vi.fn(fakeOrvalOutput);

    await expect(
      runGuardedGeneration({ origin: 'http://localhost:3000', paths, runOrval, fetchImpl: jsonFetch(foreignDocument()) }),
    ).rejects.toBeInstanceOf(OpenApiIdentityError);

    expect(runOrval).not.toHaveBeenCalled();
    expect(await hashDirectory(paths.generatedDir)).toEqual(before);
    await expect(readFile(paths.snapshotPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(paths.stagingDir, 'auth.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('G2. preserves the generated directory when Orval itself fails or produces nothing', async () => {
    const before = await hashDirectory(paths.generatedDir);

    await expect(
      runGuardedGeneration({
        origin: 'http://localhost:3100',
        paths,
        fetchImpl: jsonFetch(trainingDocument()),
        runOrval: async ({ outputDir }) => {
          await mkdir(outputDir, { recursive: true });
          await writeFile(path.join(outputDir, 'partial.ts'), '');
          throw new Error('schema error');
        },
      }),
    ).rejects.toThrow(/Orval failed/);
    expect(await hashDirectory(paths.generatedDir)).toEqual(before);

    await expect(
      runGuardedGeneration({ origin: 'http://localhost:3100', paths, fetchImpl: jsonFetch(trainingDocument()), runOrval: async () => undefined }),
    ).rejects.toThrow(/no usable client/);
    expect(await hashDirectory(paths.generatedDir)).toEqual(before);
    await expect(readFile(path.join(paths.stagingDir, 'partial.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('replaces the generated directory only after a verified document and complete Orval output', async () => {
    const runOrval = vi.fn(fakeOrvalOutput);
    const result = await runGuardedGeneration({
      origin: 'http://localhost:3100',
      paths,
      runOrval,
      fetchImpl: jsonFetch(trainingDocument()),
    });

    expect(result.identity.title).toBe('Training Platform API');
    expect(runOrval).toHaveBeenCalledWith({ snapshotPath: paths.snapshotPath, outputDir: paths.stagingDir });
    expect(JSON.parse(await readFile(paths.snapshotPath, 'utf8'))).toMatchObject({ info: { title: 'Training Platform API' } });
    expect(await readFile(path.join(paths.generatedDir, 'auth.ts'), 'utf8')).toContain('fresh');
    await expect(readFile(path.join(paths.generatedDir, 'models', 'existing.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(paths.stagingDir, 'auth.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(paths.backupDir, 'auth.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
