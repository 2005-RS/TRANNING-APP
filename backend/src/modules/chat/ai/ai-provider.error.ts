export type AiProviderErrorKind =
  | 'timeout'
  | 'aborted'
  | 'rate_limited'
  | 'unavailable'
  | 'rejected'
  | 'misconfigured'
  | 'invalid_response';

/**
 * Carries only a classification and HTTP status. Provider response bodies,
 * URLs, and credentials are never attached.
 */
export class AiProviderError extends Error {
  constructor(
    readonly kind: AiProviderErrorKind,
    readonly retryable = false,
    readonly status?: number,
  ) {
    super(`AI provider error: ${kind}`);
    this.name = 'AiProviderError';
  }
}
