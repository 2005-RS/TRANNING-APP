# Training Platform frontend

Independent React application. It does not import NestJS source. The backend stays in `/backend`.

```
project-root/
├── backend/     NestJS API
└── frontend/    this app
```

## Stack

React 19 · Vite · TypeScript strict · Tailwind CSS 4 · TanStack Router/Query/Form · Zod · Orval · Vitest

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Dev server: `http://localhost:5173` — anonymous visitors land on `/login`.

The API origin is `VITE_API_URL` (required, no fallback; `.env.example` uses `http://localhost:3000`). That value is public. Never put JWT, database, or object-storage secrets in `VITE_*`. Port map and safety checks: [`docs/frontend/local-environment.md`](../docs/frontend/local-environment.md).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Production bundle |
| `npm run preview` | Serve the production bundle |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright on its own preview server (port 4173) |
| `npm run api:generate` | Guarded Orval client from `{VITE_API_URL}/api/docs-json` |

Start the backend before `api:generate`. It refuses any OpenAPI document that is not the Training Platform API, and replaces `src/generated/` only after a verified generation completes. Never edit those files by hand, and do not run `orval` directly.

Generated clients **are committed** so `npm run build` works without a live backend and OpenAPI diffs are reviewable. After backend contract changes, run `npm run api:generate` and commit the result.

## Auth

Access tokens stay in memory (`src/shared/lib/access-token.ts`). Refresh uses the HttpOnly cookie via `credentials: 'include'`.

On load, the app bootstraps with `POST /api/v1/auth/refresh`. A 401 is a normal anonymous visit — no error toast. Success stores a new access token and loads `GET /api/v1/auth/me`.

Role homes after login (temporary F02 placeholders, not product shells):

- CLIENT → `/client`
- TRAINER → `/trainer`
- ADMIN → `/admin`

`/login?redirect=` accepts only internal `/client`, `/trainer`, or `/admin` paths. Nested paths are remembered safely and resolve to the role home until F03.

Cross-tab: the refresh cookie is shared by the browser; access tokens are per-tab memory. Tab B does not inherit Tab A's memory token until it reloads (bootstrap refresh). BroadcastChannel logout propagation is deferred.

Logout always clears memory and the Query cache, even if `POST /auth/logout` fails. `POST /auth/logout-all` is exposed on the temporary session page.

Playwright full login/logout requires `E2E_EMAIL` and `E2E_PASSWORD` in the environment. Do not commit those values. Without them, E2E still checks that `/login` renders.

## Architecture

See `/docs/frontend/` at the repository root.
