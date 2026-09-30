# Production deployment

Vendor-neutral. Do not put real passwords, JWT secrets, SMTP passwords, or `DEEPSEEK_API_KEY` in this file. This document does not deploy anything; it is the operator checklist for when you want to.

## Topology (required): single origin

```
Browser --HTTPS--> reverse proxy
                     ├─ /           → SPA (frontend image, nginx)
                     ├─ /api        → NestJS (backend image, port 3000)
                     └─ /socket.io  → NestJS (assistant + public chat)
NestJS --> PostgreSQL
NestJS --> private S3-compatible object storage
```

The SPA and the API **must** share one https origin. The refresh cookie is HttpOnly, path-scoped to `/api/v1/auth`, and there is no CSRF token layer. A split origin (`app.example.com` + `api.example.com`) would force `SameSite=None` plus `Secure`, which is the worst pairing with that CSRF gap. Keep `AUTH_COOKIE_SAME_SITE=lax` and `AUTH_COOKIE_SECURE=true`.

TLS terminates at the proxy. Nest does not terminate TLS.

Set `TRUST_PROXY=true` on the API whenever a proxy sits in front. Default `false` is only for a process that sees the real client connection. Behind a proxy, `false` breaks `req.secure` (Secure cookies) and the IP used by throttling / the public chat rate limit.

## `VITE_API_URL` is baked at build time

`frontend/src/shared/config/env.ts` reads `import.meta.env.VITE_API_URL`. There is **no** runtime override. Consequences:

- The GitHub Actions artifact is built with `VITE_API_URL=http://localhost:3000`. **Do not deploy that tarball or image.**
- Production must run a separate frontend image build:

  ```bash
  docker build -t training-frontend:release \
    --build-arg VITE_API_URL=https://training.example.com \
    --build-arg VITE_APP_ENV=production \
    frontend/
  ```

- For single-origin, `VITE_API_URL` is the **public https origin** (no trailing slash, no `/api` suffix). The SPA calls `{VITE_API_URL}/api/v1/...` and `wss:` on the same host.
- Changing the public hostname requires a new frontend build and roll-forward. The backend image does not embed that URL except `APP_PUBLIC_URL` (password-reset links).

`VITE_APP_ENV=production` also requires `VITE_API_URL` to be `https`.

## Frontend image

`frontend/Dockerfile` is multi-stage: Node 22 builds the Vite SPA, nginx 1.27 serves it.

- Deep links need SPA fallback. nginx `try_files $uri $uri/ /index.html` is mandatory because the router uses `createBrowserHistory()`. Without it, `/trainer/clients/<uuid>` is a 404 on refresh.
- CSP, `Referrer-Policy`, `nosniff`, and `Permissions-Policy` match [security-review.md](./security-review.md). `index.html` is `Cache-Control: no-cache`; hashed `/assets/*` are immutable.
- Pass `STORAGE_ORIGIN` at **run** time (not baked). It is the object-storage origin used in `img-src`, `media-src`, and `connect-src` (signed GET and signed POST from the browser):

  ```bash
  docker run --rm -p 8080:80 \
    -e STORAGE_ORIGIN=https://training-media.s3.eu-west-1.amazonaws.com \
    training-frontend:release
  ```

- The `script-src` hash is the SHA-256 of the inline theme/language script in `frontend/index.html` (LF line endings, as Linux CI checks out). If that script changes, recompute the hash from the built `dist/index.html` and update `frontend/docker/nginx.conf.template` plus [security-review.md](./security-review.md).

Build the image on Linux (CI). A Windows checkout with CRLF would change the hash and the browser would block the inline script.

The frontend container does **not** proxy `/api`. Put nginx/Caddy/Traefik in front of both containers. Sample edge location:

```
location /api/ {
    proxy_pass http://api:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /socket.io/ {
    proxy_pass http://api:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://web:80;
}
```

`CORS_ORIGIN` in this topology is the same public origin (`https://training.example.com`). Never `*`.

## Backend image

`backend/Dockerfile`. Never bake `.env` into the image. Pass secrets at runtime.

```bash
docker build -t training-backend:release backend/
docker run --rm -p 3000:3000 --env-file /secure/path/prod.env training-backend:release
```

Health: `GET /api/v1/health` (unauthenticated). A 200 body looks like `{ "status": "ok", "info": { "postgres": { "status": "up" }, "storage": { "status": "up" } } }`. It never includes hostnames, secrets, or SQL.

## Production environment

### Frontend (build-args and runtime)

| Variable | When | Notes |
| --- | --- | --- |
| `VITE_API_URL` | **build-arg, required** | Public https origin, no trailing slash. Baked into JS. |
| `VITE_APP_ENV` | **build-arg** | `production`. Forces https on `VITE_API_URL`. |
| `STORAGE_ORIGIN` | **runtime, required** | Object-storage origin for CSP. Example `https://<bucket>.s3.<region>.amazonaws.com`. |

No other `VITE_*` values exist. Never put JWT, database, SMTP, or DeepSeek secrets in `VITE_*`.

### Backend (runtime)

See `backend/.env.example` for the grouped list. Production-required:

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Default 3000 inside the image |
| `TRUST_PROXY` | `true` behind the reverse proxy |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | Managed PostgreSQL |
| `DATABASE_SSL` | `true` when the provider requires TLS |
| `CORS_ORIGIN` | Explicit https origin(s). `*` is rejected at boot |
| `JWT_ACCESS_SECRET` | Min 32 chars, not a placeholder |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_ACCESS_ISSUER`, `JWT_ACCESS_AUDIENCE` | |
| `AUTH_REFRESH_TTL_DAYS`, `AUTH_REFRESH_COOKIE_NAME` | |
| `AUTH_COOKIE_SECURE` | `true` |
| `AUTH_COOKIE_SAME_SITE` | `lax` for this topology |
| `OBJECT_STORAGE_DRIVER` | `s3` |
| `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` | |
| `OBJECT_STORAGE_ENDPOINT` | Unset for AWS; set for MinIO-compatible providers |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` for path-style endpoints |
| `EXERCISE_MEDIA_UPLOAD_TTL_SECONDS`, `EXERCISE_MEDIA_READ_TTL_SECONDS` | |
| `EXERCISE_VIDEO_MAX_BYTES`, `EXERCISE_IMAGE_MAX_BYTES`, `PROGRESS_PHOTO_MAX_BYTES` | |
| `AI_PROVIDER` | `deepseek` (`mock` is rejected in production) |
| `DEEPSEEK_API_KEY` | Backend-only secret |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-flash` or `deepseek-v4-pro` |
| `APP_PUBLIC_URL` | Public https origin of the SPA; used in password-reset emails |
| `MAIL_TRANSPORT` | `smtp` (`log` is rejected in production) |
| `MAIL_FROM`, `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_SECURE`, `MAIL_SMTP_USER`, `MAIL_SMTP_PASSWORD` | |

Optional: `SWAGGER_ENABLED` (default false), `HTTP_JSON_BODY_LIMIT_BYTES`, pool timeouts, `AI_*` rate/history caps, `AI_PUBLIC_CHAT_ENABLED`.

`AUTH_E2E_SKIP_THROTTLE` must be unset. Production refuses to boot if it is set.

## Secrets

- Store in the platform secret manager (GitHub Actions environment secrets, Docker/Kubernetes secrets, or equivalent). Never in git, image layers, or frontend `VITE_*`.
- Rotate `JWT_ACCESS_SECRET` only with a planned logout of every session (new secret invalidates access tokens; refresh cookies still need the matching server-side session rows).
- Rotate `DEEPSEEK_API_KEY`, `MAIL_SMTP_PASSWORD`, and object-storage keys independently of JWT.

## Database migrations

`synchronize=false`. `migrationsRun=false`. Do **not** auto-run migrations on boot.

1. Backup PostgreSQL and object storage (they are one restore unit).
2. Run migrations as an explicit job against the target database, using the **same** image tag you are about to serve:

   ```bash
   NODE_ENV=production npm run migration:run:prod
   ```

   Inside the backend image that is `node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js` with production env.
3. Confirm `GET /api/v1/health` is 200 with postgres and storage `up`.
4. Route traffic to the new API, then the new SPA.

Rollback: restore PostgreSQL + object storage from the matching backup, then deploy the previous image tags. `migration:revert` is a development tool, not a production rollback.

## Seeds and the exercise pack

The production image is pruned (`npm prune --omit=dev`). Two documented scripts use `ts-node`, which is a **devDependency** and is **not** in the runtime image:

- `npm run seed:admin`
- `npm run import:exercise-library` / `npm run exercises:import`

Run those from a source checkout or a CI job that executed `npm ci` (full install), pointed at the production database, never from the pruned API container. `seed:admin` also refuses `admin@example.com` and known default passwords when `NODE_ENV=production`.

The Vital Animations exercise pack is **not in the repository** (`.gitignore`: `/assets/import/vital-animations/**`). A newly migrated database has trainers/clients only after `seed:admin`, and has **no exercise catalog** until an operator imports the pack from a private drop. Until then, Trainers cannot build templates that reference catalog exercises.

## DNS and TLS

- One A/AAAA (or CNAME) for the public hostname.
- Certificate on the reverse proxy only.
- HSTS is set by Nest on API responses in production; the SPA nginx config does not duplicate HSTS so a single proxy hop can own max-age.

## Backups

See [backend/docs/production-runbook.md](../../backend/docs/production-runbook.md). Restore Postgres and the private bucket together.

## Release checklist

1. `main` is green on CI (backend lint/test/build, frontend lint/test/build, Playwright `channel: 'chrome'`).
2. Migrations reviewed; no `synchronize: true`.
3. Secrets present in the target environment (table above). `AUTH_E2E_SKIP_THROTTLE` absent.
4. Backup PostgreSQL + object storage.
5. Build **backend** image from the release tag.
6. Build **frontend** image with production `VITE_API_URL` / `VITE_APP_ENV` (not the CI localhost build).
7. Run migrations (`migration:run:prod`).
8. Start API with `TRUST_PROXY=true`. Confirm `/api/v1/health` → postgres + storage up.
9. Start SPA with `STORAGE_ORIGIN`. Confirm `/` and a deep link (`/login`, `/forgot-password`) both serve `index.html`.
10. Confirm login sets the refresh cookie on `/api/v1/auth`, access token stays in memory, and a signed photo/media URL loads under the CSP.
11. Confirm `POST /api/v1/auth/forgot-password` returns 202 and, in production, SMTP delivers a fragment link under `APP_PUBLIC_URL`.
12. Smoke Client Home, a Trainer template duplicate, Admin dashboard unread count, and the notification inbox.
13. Keep the previous image tags until the smoke window ends.

Operators deploy; this repository does not ship a cloud-vendor pipeline.
