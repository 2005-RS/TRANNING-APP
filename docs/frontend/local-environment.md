# Local environment (Training App)

This workstation also runs other projects (for example **SIGASJ**, which uses `localhost:3000` and `localhost:5173`). Training App tooling is built to **fail safe**: a wrong or missing service stops the command instead of silently talking to another project.

Values below come from the repository configuration. Change a port in one place and update this table.

## Port map

| Service | URL / port | Source of truth |
| --- | --- | --- |
| Training frontend (dev) | `http://localhost:5173` (strict) | `frontend/scripts/local-ports.mjs` → `vite.config.ts` `server` |
| Training backend (API) | `http://localhost:3000` by default | `backend/.env` `PORT`; frontend reads it via `VITE_API_URL` |
| Swagger UI | `{VITE_API_URL}/api/docs` | `backend/src/config/swagger.setup.ts` |
| OpenAPI JSON | `{VITE_API_URL}/api/docs-json` | same |
| Playwright / `vite preview` | `http://localhost:4173` (strict, owned by the E2E suite) | `frontend/scripts/local-ports.mjs` → `vite.config.ts` `preview`, `playwright.config.ts` |
| PostgreSQL | `localhost:5432` | `backend/docker-compose.yml` `POSTGRES_PORT` (default 5432) |
| MinIO S3 API | `http://localhost:9100` (private bucket `training-exercise-media`) | `backend/docker-compose.yml` `MINIO_API_PORT` |
| MinIO console | `http://localhost:9101` | `backend/docker-compose.yml` `MINIO_CONSOLE_PORT` |

**Known collision:** SIGASJ also defaults to API `3000` and frontend `5173`. The two projects cannot run their defaults at the same time. If SIGASJ is running, start the Training backend with `PORT=3100` (in `backend/.env` or the shell) and set `VITE_API_URL=http://localhost:3100` for the frontend. Vite dev fails on an occupied `5173` (`strictPort`); stop the other dev server first.

The backend `CORS_ORIGIN` must list the frontend origin you use (`http://localhost:5173` for dev; add `http://localhost:4173` only for credentialed real-backend Playwright runs).

## API URL (single source of truth)

`VITE_API_URL` — shell environment first, then `frontend/.env*` files (Vite `loadEnv` precedence). It is **required**: there is no fallback port in `vite.config.ts`, `orval.config.ts`, or the runtime (`src/shared/lib/api-origin.ts`). Missing or malformed values fail `dev`, `build`, and `api:generate` with an actionable message.

## OpenAPI identity guard (`npm run api:generate`)

`api:generate` runs `scripts/api-generate.mjs`, never Orval directly:

```
resolve VITE_API_URL → GET /api/docs-json → HTTP/JSON checks → identity checks
  → write validated snapshot → Orval into src/.generated-staging → verify output
  → swap into src/generated
```

Identity requires **all** of:

- OpenAPI `3.x` document with a `paths` object (Swagger 2, HTML, arrays, invalid JSON rejected)
- `info.title === "Training Platform API"` (from `backend/src/config/swagger.setup.ts`)
- every path under `/api/v1/`
- canonical Training operations: `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`, `GET /api/v1/admin/dashboard`, `GET /api/v1/trainers`, `GET /api/v1/clients/me/dashboard`, `GET /api/v1/clients/{clientId}/trainer-history`, `GET /api/v1/exercises`, `GET /api/v1/nutrition/foods`
- security scheme `access-token`

The `/api/v1` prefix and version `1.0.0` alone are **not** identity: SIGASJ uses both.

On any failure the command prints `TRAINING API VALIDATION FAILED` (expected vs received title, URL, reasons) and exits non-zero **before Orval runs**. `src/generated/` is untouched. Orval only ever reads the validated local snapshot (`orval.config.ts` throws when invoked outside the guard), and writes to a staging directory first, so an Orval failure also leaves the committed client intact.

`npm run dev` performs the same identity check once at startup: a foreign API stops the dev server; an unreachable API only warns (starting the frontend before the backend is normal).

Fingerprint the generated client: `node scripts/hash-generated.mjs` (SHA-256 over sorted relative paths and file hashes).

## Playwright server ownership

- `npx playwright test` starts its **own** `vite preview` of `dist/` on port **4173** via `scripts/e2e-preview.mjs`. `reuseExistingServer` is `false`.
- Before anything starts, `playwright.config.ts` probes 4173 (IPv4 and IPv6 loopback). If occupied it stops with *"Training App E2E port 4173 is already in use … Tests were not started."* There is no fallback port.
- `e2e-preview.mjs` refuses a missing `dist/` or a build without the Training marker.
- `e2e/global-setup.ts` fetches the base URL and requires `<meta name="app-id" content="training-app">` before any test runs.
- Servers on other ports (for example another project's `5173`) are never contacted by the canonical suite.
- Build first: the quality gate runs `npm run build` before Playwright.
