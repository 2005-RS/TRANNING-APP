const TOKEN_PATTERN = /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{32,}$/i;

/** Reads the reset token from the URL fragment (`#token=...`), which browsers never send to servers. */
export function readResetToken(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const token = params.get('token');
  return token && TOKEN_PATTERN.test(token) ? token : null;
}
