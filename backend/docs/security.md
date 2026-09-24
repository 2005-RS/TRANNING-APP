# Backend security model

This document describes Backend V1 authentication, authorization, cookies, CORS, object storage, and known limitations. It does not contain secrets.

## Topology

Production is expected to use HTTPS end-to-end at the edge:

Browser → HTTPS → Frontend origin → HTTPS → NestJS API → PostgreSQL  
NestJS API → private S3-compatible object storage

TLS terminates at a reverse proxy, load balancer, or cloud provider. Nest does not terminate TLS.

Same-site deployments (API and frontend on one registrable domain, for example `app.example.com` and `api.example.com` as sibling hosts) should use `AUTH_COOKIE_SAME_SITE=lax` and `AUTH_COOKIE_SECURE=true`.

True cross-site frontend/API origins require `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true`. Do not set `SameSite=None` unless that topology is real.

Local development may use HTTP with `AUTH_COOKIE_SECURE=false` and `SameSite=lax`.

## Authentication

- Passwords are hashed with Argon2id. `passwordHash` is `select: false` and is never serialized.
- Login for an unknown email still runs a dummy Argon2id hash for timing resistance.
- Access tokens are short-lived JWTs (HS256) with issuer, audience, and expiration checks.
- `AccessAuthGuard` revalidates the user and session (`sid`) on each protected request. Disabled users are rejected immediately even if the JWT has not expired.
- Refresh tokens are opaque secrets. Only a digest is stored. The raw secret is set as an HttpOnly cookie (`Path=/api/v1/auth`), rotated on refresh, replay-detected, and absolutely expired.
- Logout revokes the current session. Logout-all revokes every session for the user.
- Disabling a user revokes refresh sessions in the same transaction. Re-enable does not restore old sessions.

Frontend contract:

1. Login returns `accessToken` in JSON. Store it in memory only. Never use `localStorage`.
2. Refresh secret remains in the HttpOnly cookie (`credentials: 'include'`).
3. On 401 from an expired access token, call `POST /api/v1/auth/refresh` with credentials, then retry with the new access token.
4. Logout and logout-all clear the cookie server-side.

## Authorization

IDs are identifiers, not authorization.

Roles: `ADMIN`, `TRAINER`, `CLIENT`. Endpoints are deny-by-default.

A TRAINER may access Client-scoped resources only when a current `TrainerClientAssignment` exists (`ended_at IS NULL`). Historical assignments, `createdByUserId`, `reviewedByUserId`, and `trainerId` stored on a resource do not grant access.

Inaccessible or missing resources return 404 so existence is not leaked across tenants. Wrong role returns 403. Unauthenticated returns 401. Malformed UUIDs return 400.

## CORS

Production forbids `CORS_ORIGIN=*`. Origins are an explicit comma-separated list of absolute `http(s)` origins. The API never reflects arbitrary `Origin` headers.

Development may use `http://localhost:<frontend-port>`. Multiple origins are allowed when listed explicitly.

Credentials are enabled. CORS and cookie `SameSite` must match the real frontend/API topology.

## Security headers

Helmet is enabled for all routes.

- API routes use Helmet's default Content-Security-Policy.
- Swagger UI (`/api/docs` and `/api/docs/...`) uses a scoped CSP that allows the inline scripts/styles Swagger requires. `/api/docs-json` keeps the default API CSP.
- HSTS is enabled only when `NODE_ENV=production`.
- `X-Content-Type-Options: nosniff` and frame protections come from Helmet defaults.

A global CSP is not defined for the JSON API beyond Helmet defaults. A broken API-wide CSP would not help browsers consuming JSON.

## Rate limits

All values are per IP per 60 seconds unless skipped.

| Scope | Limit |
| --- | --- |
| Global authenticated/public API | 120 |
| `POST /api/v1/auth/login` | 8 |
| `POST /api/v1/auth/refresh` | 12 |
| Exercise media and progress-photo upload-request | 20 |
| `GET /api/v1/health` | exempt |

Login and refresh limits stay enabled in every environment. Functional E2E sets `AUTH_E2E_SKIP_THROTTLE=true`; a dedicated throttle suite asserts HTTP 429.

## Object storage

Private S3-compatible bucket. Clients never choose object keys. Signed POST uses the server-generated key, MIME allowlist, and content-length range. Signed GET TTLs are short. `storageKey` is omitted from normal responses. There is no permanent public URL.

Accepted V1 limitations:

- HEAD verifies size/type metadata, not file magic bytes.
- No malware scanner, transcoding, or image/video processing.
- No stale PENDING upload cleanup worker.
- Object delete and metadata delete are not a single distributed transaction.

SVG and executable types are rejected. Original filenames are not used as storage paths.

## Secrets

Production rejects empty/placeholder JWT secrets and well-known database passwords such as `changeme`. Admin seed is opt-in (`npm run seed:admin`) and refuses `example.com` addresses and known default passwords in production. Secrets are not logged.

## Errors and logs

Responses use `statusCode`, `code`, `message`, `path`, `timestamp`, `requestId`. Production unexpected errors are sanitized. Request logs include requestId, method, path, status, and duration only.

## Account erasure

Foreign keys use `RESTRICT` for historical training/nutrition data. Full account erasure is not implemented. That requires a future product/legal workflow.

## Retention

No automatic retention job exists for ActivityEvents, Notifications, auth session history, progress-photo metadata, or stale PENDING uploads. Treat as a future operational decision.
