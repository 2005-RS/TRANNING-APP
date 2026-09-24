export declare const EXPECTED_OPENAPI_TITLE: string;
export declare const EXPECTED_PATH_PREFIX: string;
export declare const OPENAPI_DOCS_PATH: string;
export declare const CANONICAL_OPERATIONS: ReadonlyArray<readonly [string, string]>;
export declare const EXPECTED_SECURITY_SCHEME: string;

export declare class OpenApiIdentityError extends Error {
  constructor(summary: string, details?: { url?: string; receivedTitle?: string; reasons?: string[] });
  url: string | undefined;
  receivedTitle: string | undefined;
  reasons: string[];
}

export interface OpenApiIdentity {
  title: string;
  version: string;
  pathCount: number;
}

export declare function normalizeApiOrigin(value: string | undefined): string;
export declare function openApiDocumentUrl(origin: string): string;
export declare function assertTrainingOpenApiDocument(document: unknown, url?: string): OpenApiIdentity;
export declare function fetchTrainingOpenApiDocument(
  url: string,
  options?: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<{ document: unknown; text: string; identity: OpenApiIdentity }>;
export declare function formatIdentityFailure(error: unknown): string;
