# Frontend security review

Reviewed 2026-09-30 against source (A5). Source wins if this drifts.

## Findings

| Area | State |
| --- | --- |
| Access token | Memory only (`shared/lib/access-token.ts`). No `localStorage`, `sessionStorage`, IndexedDB, or JS-written cookies. `localStorage` holds only theme and UI language. |
| Refresh | HttpOnly cookie scoped to `/api/v1/auth`, single-flight refresh in `api-mutator.ts`. |
| Logging | `logDevError` is DEV-only and replaces any message mentioning authorization, bearer, tokens, cookies, or signed/`x-amz-` URLs with `[redacted]`. No other `console.*` in `src`. |
| Errors | `mapApiError` never shows backend 5xx text; every failure gets a `kind` (`network`, `forbidden`, `not-found`, …). A request that never reaches the server throws `NetworkError`. `AppErrorBoundary` covers failures above the router; `RouteErrorPage` covers route errors. |
| API headers | Helmet on every API response (CSP, `nosniff`, frame denial); HSTS only in production. |
| CORS | Explicit origin list with credentials; `*` rejected in production at boot. Socket.IO uses the same list. |
| Rate limits | Global 120/60 s, login 8/min, refresh 12/min, upload requests 20/min. `AUTH_E2E_SKIP_THROTTLE` is ignored when `NODE_ENV=production`, and production refuses to boot if it is set. |
| CSRF | No token layer. Relies on the refresh cookie being `SameSite` and path-scoped, plus the access token travelling only in the `Authorization` header. Keep the single-origin topology (below); a cross-site deployment with `SameSite=None` would need a CSRF review first. |

## SPA Content-Security-Policy

Helmet only protects API responses. The static server that serves `index.html`
and `/assets/*` must send its own policy. Recommended for the single-origin
topology, where the SPA and `/api` share one origin behind a reverse proxy:

```
default-src 'self';
script-src 'self' 'sha256-gq8zQQX10dMH/2iO9XKuI+tsm3uYzrZXWjG9bKrPmDQ=';
style-src 'self' 'unsafe-inline';
img-src 'self' <STORAGE_ORIGIN>;
media-src 'self' <STORAGE_ORIGIN>;
font-src 'self';
connect-src 'self' <STORAGE_ORIGIN>;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

Why each exception exists:

- **`script-src` hash**: the inline theme/language script in `index.html` runs before first paint to avoid a theme flash. If that script changes, recompute the hash from the built `dist/index.html` (`sha256` of the script body, base64).
- **`style-src 'unsafe-inline'`**: Sonner injects a `<style>` element at runtime. Inline style *attributes* written by React/Motion go through the CSSOM and are not affected. Scripts stay strict, so this does not open script injection.
- **`<STORAGE_ORIGIN>`**: progress photos, exercise media, and direct uploads use short-lived signed URLs on the object-storage origin (for example `https://<bucket>.s3.<region>.amazonaws.com`). Uploads are `PUT` from the browser, so storage is also in `connect-src`.
- **`connect-src 'self'`**: covers REST and the Socket.IO assistant (`wss:` to the same origin is allowed by `'self'` in current browsers). If the API is on a different origin, add both `https://api…` and `wss://api…`.
- **No `data:`, `blob:`, or workers**: the 2026-09-30 build uses none (icons are inline SVG elements). Add them deliberately if that changes.

Also send `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`. `index.html` must be served with `Cache-Control: no-cache`, hashed `/assets/*` with a long immutable cache.
