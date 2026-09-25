const SENSITIVE =
  /authorization|bearer\s+[a-z0-9._~+/-]+=*|refresh.?token|access.?token|cookie:|signed(?:url)?|x-amz-/i;

function redact(value: string): string {
  if (SENSITIVE.test(value)) {
    return '[redacted]';
  }
  return value;
}

/**
 * Development-only diagnostics. Never logs tokens, cookies, or signed URLs.
 * Production builds stay silent so a thrown Error cannot leak request context.
 */
export function logDevError(error: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (error instanceof Error) {
    console.error(redact(error.name), redact(error.message));
    return;
  }

  if (typeof error === 'string') {
    console.error(redact(error));
    return;
  }

  console.error('Application error');
}
