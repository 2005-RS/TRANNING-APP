import type { OpenApiIdentity } from './openapi-identity.mjs';

export declare class GenerationStepError extends Error {
  constructor(message: string, cause?: unknown);
}

export interface GenerationPaths {
  generatedDir: string;
  stagingDir: string;
  backupDir: string;
  snapshotPath: string;
}

export declare function defaultGenerationPaths(frontendDir: string): GenerationPaths;

export declare function runOrvalCli(options: { frontendDir: string; snapshotPath: string; outputDir: string }): Promise<void>;

export declare function runGuardedGeneration(options: {
  origin: string;
  paths: GenerationPaths;
  runOrval: (options: { snapshotPath: string; outputDir: string }) => Promise<unknown>;
  fetchImpl?: typeof fetch;
}): Promise<{ url: string; identity: OpenApiIdentity; fileCount: number }>;
