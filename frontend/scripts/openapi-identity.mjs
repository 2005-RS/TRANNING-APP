/**
 * Training App OpenAPI identity.
 *
 * Other local projects (for example SIGASJ) also serve NestJS Swagger under
 * `/api/docs-json` with an `/api/v1` prefix and version `1.0.0`, so an HTTP 200
 * or a matching prefix proves nothing. Identity requires the exact title from
 * `backend/src/config/swagger.setup.ts` AND several Training-only operations.
 */

export const EXPECTED_OPENAPI_TITLE = 'Training Platform API';
export const EXPECTED_PATH_PREFIX = '/api/v1/';
export const OPENAPI_DOCS_PATH = '/api/docs-json';

/** Training-only operations. Each must exist with the given HTTP method. */
export const CANONICAL_OPERATIONS = [
  ['get', '/api/v1/auth/me'],
  ['post', '/api/v1/auth/refresh'],
  ['get', '/api/v1/admin/dashboard'],
  ['get', '/api/v1/trainers'],
  ['get', '/api/v1/clients/me/dashboard'],
  ['get', '/api/v1/clients/{clientId}/trainer-history'],
  ['get', '/api/v1/exercises'],
  ['get', '/api/v1/nutrition/foods'],
];

export const EXPECTED_SECURITY_SCHEME = 'access-token';

const FETCH_TIMEOUT_MS = 10_000;

export class OpenApiIdentityError extends Error {
  /**
   * @param {string} summary
   * @param {{ url?: string; receivedTitle?: string; reasons?: string[] }} [details]
   */
  constructor(summary, details = {}) {
    super(summary);
    this.name = 'OpenApiIdentityError';
    this.url = details.url;
    this.receivedTitle = details.receivedTitle;
    this.reasons = details.reasons ?? [summary];
  }
}

/**
 * Validates an absolute http(s) origin without path, query, or trailing slash.
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeApiOrigin(value) {
  const raw = value?.trim();
  if (!raw) {
    throw new OpenApiIdentityError('VITE_API_URL is not set.', {
      reasons: [
        'VITE_API_URL is not set.',
        'Set it in frontend/.env (see frontend/.env.example) or in the shell environment.',
        'There is intentionally no default port: another local project may be listening on it.',
      ],
    });
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new OpenApiIdentityError(`VITE_API_URL is not an absolute URL: ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OpenApiIdentityError(`VITE_API_URL must use http or https: ${raw}`);
  }
  if (raw.endsWith('/') || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new OpenApiIdentityError(
      `VITE_API_URL must be an origin only (no path or trailing slash), for example http://localhost:3000. Received: ${raw}`,
    );
  }
  return parsed.origin;
}

/** @param {string} origin */
export function openApiDocumentUrl(origin) {
  return `${origin}${OPENAPI_DOCS_PATH}`;
}

/**
 * Validates that a parsed document is the Training App OpenAPI document.
 * @param {unknown} document
 * @returns {{ title: string; version: string; pathCount: number }}
 */
export function assertTrainingOpenApiDocument(document, url) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new OpenApiIdentityError('Response is not an OpenAPI document (expected a JSON object).', { url });
  }
  const doc = /** @type {Record<string, unknown>} */ (document);
  const info = doc.info && typeof doc.info === 'object' ? /** @type {Record<string, unknown>} */ (doc.info) : undefined;
  const receivedTitle = typeof info?.title === 'string' ? info.title : undefined;

  if (typeof doc.openapi !== 'string' || !/^3\.\d+\.\d+$/.test(doc.openapi)) {
    const kind = typeof doc.swagger === 'string' ? `Swagger ${doc.swagger}` : 'unknown document type';
    throw new OpenApiIdentityError(`Expected an OpenAPI 3.x document, received ${kind}.`, { url, receivedTitle });
  }
  if (!doc.paths || typeof doc.paths !== 'object' || Array.isArray(doc.paths)) {
    throw new OpenApiIdentityError('OpenAPI document has no paths object.', { url, receivedTitle });
  }

  const reasons = [];
  if (receivedTitle !== EXPECTED_OPENAPI_TITLE) {
    reasons.push(`info.title is ${receivedTitle === undefined ? 'missing' : JSON.stringify(receivedTitle)}, expected ${JSON.stringify(EXPECTED_OPENAPI_TITLE)}.`);
  }

  const paths = /** @type {Record<string, Record<string, unknown> | undefined>} */ (doc.paths);
  const pathNames = Object.keys(paths);
  const foreignPaths = pathNames.filter((name) => !name.startsWith(EXPECTED_PATH_PREFIX));
  if (pathNames.length === 0) {
    reasons.push('Document declares no paths.');
  } else if (foreignPaths.length > 0) {
    reasons.push(`Paths outside ${EXPECTED_PATH_PREFIX}: ${foreignPaths.slice(0, 5).join(', ')}${foreignPaths.length > 5 ? ', …' : ''}.`);
  }

  const missing = CANONICAL_OPERATIONS.filter(([method, path]) => !paths[path]?.[method]).map(
    ([method, path]) => `${method.toUpperCase()} ${path}`,
  );
  if (missing.length > 0) {
    reasons.push(`Missing canonical Training operations: ${missing.join(', ')}.`);
  }

  const components = doc.components && typeof doc.components === 'object' ? /** @type {Record<string, unknown>} */ (doc.components) : undefined;
  const schemes = components?.securitySchemes && typeof components.securitySchemes === 'object' ? components.securitySchemes : {};
  if (!(EXPECTED_SECURITY_SCHEME in schemes)) {
    reasons.push(`Missing security scheme ${JSON.stringify(EXPECTED_SECURITY_SCHEME)}.`);
  }

  if (reasons.length > 0) {
    throw new OpenApiIdentityError('Document is not the Training App OpenAPI document.', { url, receivedTitle, reasons });
  }

  return {
    title: /** @type {string} */ (receivedTitle),
    version: typeof info?.version === 'string' ? info.version : 'unknown',
    pathCount: pathNames.length,
  };
}

/**
 * Fetches and validates the OpenAPI document. Never follows redirects to
 * another origin silently.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch; timeoutMs?: number }} [options]
 */
export async function fetchTrainingOpenApiDocument(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new OpenApiIdentityError(`Could not reach the Training API: ${cause}`, {
      url,
      reasons: [`Could not reach the Training API: ${cause}`, 'Start the Training backend (cd backend && npm run start:dev) and check VITE_API_URL.'],
    });
  }
  if (!response.ok) {
    throw new OpenApiIdentityError(`OpenAPI request failed with HTTP ${response.status}.`, {
      url,
      reasons: [`OpenAPI request failed with HTTP ${response.status}.`, 'Swagger must be enabled (SWAGGER_ENABLED) on the Training backend.'],
    });
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new OpenApiIdentityError(`Expected a JSON response, received content-type ${JSON.stringify(contentType || 'none')}.`, { url });
  }
  const text = await response.text();
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new OpenApiIdentityError('Response body is not valid JSON.', { url });
  }
  const identity = assertTrainingOpenApiDocument(document, url);
  return { document, text, identity };
}

/** @param {unknown} error */
export function formatIdentityFailure(error) {
  const failure =
    error instanceof OpenApiIdentityError ? error : new OpenApiIdentityError(error instanceof Error ? error.message : String(error));
  return [
    'TRAINING API VALIDATION FAILED',
    '',
    'Expected:',
    `Training App API (OpenAPI info.title "${EXPECTED_OPENAPI_TITLE}")`,
    '',
    'Received:',
    failure.receivedTitle ?? 'no Training App OpenAPI identity',
    '',
    'URL:',
    failure.url ?? 'not resolved',
    '',
    'Reasons:',
    ...failure.reasons.map((reason) => `- ${reason}`),
  ].join('\n');
}
