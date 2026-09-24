/**
 * API origin for the fetch mutator.
 *
 * This module must not read `import.meta.env`. Orval bundles the mutator with
 * esbuild to count parameters; pulling Vite env into that graph warns on
 * `import.meta` under Orval's default ES2015 target and can fail analysis,
 * which makes generated QueryFunctions pass a raw AbortSignal.
 *
 * There is deliberately no default origin: a guessed localhost port may belong
 * to another local project. `getPublicEnv()` sets it at startup.
 */
let apiOrigin: string | undefined;

export function setApiOrigin(origin: string): void {
  apiOrigin = origin;
}

export function getApiOrigin(): string {
  if (!apiOrigin) {
    throw new Error('API origin is not configured. getPublicEnv() must run before API calls (VITE_API_URL).');
  }
  return apiOrigin;
}
