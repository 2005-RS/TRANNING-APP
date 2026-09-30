# Frontend quality gates

Reusable checks for every roadmap phase. Run from `/frontend` unless noted.

Do not claim a phase VERIFIED if the gate fails. Intentional Playwright skips must be explained in the phase report.

## Global frontend quality gate

```bash
npm run api:generate
npm test
npm run lint
npm run build
```

Expectations:

- `api:generate` succeeds against the OpenAPI source used by Orval
- Vitest: all tests passing
- ESLint: **0 errors**; preferably **0 warnings**
- `tsc -b` + Vite build: **0 TypeScript errors**
- No hand-edits in `src/generated/**`
- No auth-token storage regressions (memory access token; HttpOnly refresh cookie)

## Browser / E2E

When the phase changes browser behavior (auth, routing, workout, uploads, role shells):

```bash
npx playwright test
```

Equivalent project script: `npm run test:e2e`.

Playwright browser strategy:

```ts
channel: 'chrome'
```

Use the installed Chrome browser. Do **not** require downloaded Playwright Chromium on this workstation unless configuration is deliberately changed later.

Playwright **workers are serialized (`workers: 1`, `fullyParallel: false`)** in `frontend/playwright.config.ts`. On this workstation a cold Vite *dev* transform cannot finish several parallel first navigations inside the 30s `navigationTimeout`.

The Playwright `webServer` therefore serves the production build with `vite preview`. The quality gate already runs `npm run build` immediately before `npx playwright test`, so preview has no transform queue. Do **not** rely on `--workers=1` as a CLI override. Do not inflate navigation timeouts to hide Vite contention.

Server ownership: the suite starts its own preview on the dedicated strict port **4173** and never reuses an existing server. An occupied port, a missing `dist/`, or a served page without the Training App marker stops the run before any test. See [local-environment.md](./local-environment.md).

`npm run api:generate` is guarded: it refuses any OpenAPI document that is not the Training Platform API and never deletes `src/generated/` before a verified generation completes.

The canonical command is:

```bash
npx playwright test
```

Credential-dependent tests may skip when `E2E_EMAIL` / `E2E_PASSWORD` are unset. Report skips as intentional. Do not commit credentials.

## Generated API / config changes

If Orval config, the fetch mutator contract, or OpenAPI-driven types change:

1. `npm run api:generate`
2. `npm run build` (regenerate → build verification)
3. `npm test` and `npm run lint`

Never skip generate-then-build after contract regeneration.

## Phase tests

Run focused tests for the phase **and** the global gate. Do not weaken assertions to pass.

Critical paths that must keep coverage as features land:

- Auth refresh / session
- Role routing
- Workout set submit (F05+)
- IDOR-facing UI (hiding is not security)

## Continuous integration

`.github/workflows/ci.yml` runs on every push to any branch; a pull request to `main` shows the run of its head commit. Four jobs run in parallel:

| Job | What it runs |
| --- | --- |
| Backend (lint, build, unit, e2e) | `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` against a PostgreSQL 16 service (`training_test`, in-memory object storage) |
| Backend (MinIO storage e2e) | `npm run test:e2e:minio` against PostgreSQL and a real MinIO container |
| Frontend (lint, test, build) | `npm run lint`, `npm test`, `npm run build` |
| E2E (Playwright + real API) | Builds, runs `npx playwright test` with no API running, then starts the API with PostgreSQL and MinIO, checks that `npm run api:generate` leaves `src/generated/` unchanged, seeds an ADMIN, creates one CLIENT and one TRAINER through the API, and runs the real-API smoke tests |

The mocked specs run before the API starts because they only route the endpoints they assert on: against a live API, an unrouted call gets a real 401 and ends the mocked session. Making every spec route all of `/api/v1/**` would remove that ordering constraint.

In the E2E job the credential-dependent smoke tests run instead of skipping: `E2E_EMAIL` / `E2E_PASSWORD` and `E2E_TRAINER_EMAIL` / `E2E_TRAINER_PASSWORD` are random per run and never stored. Every secret in the workflow belongs to a throwaway API that only exists inside that job.

If the contract step fails, the backend OpenAPI changed without regenerating the client: run `npm run api:generate` against the current backend and commit `src/generated/` in its own PR.

A red CI blocks the merge. Making the checks required is a repository setting (branch ruleset on `main`), not part of the workflow file.

## Backend

Do not run backend migrations, backend test suites, or API redesign as part of an unauthorized frontend phase.

If a frontend task is explicitly authorized to touch backend, follow `.cursor/rules/backend-standards.mdc` and report backend files separately.

## Verification rule

Cursor may NOT mark a phase VERIFIED only because implementation looks complete.

Required:

- Required functionality complete
- Tests pass
- Lint passes
- Build passes
- Browser tests pass **or** skips are justified
- Security review passes
- No known phase blocker

Then report `FRONTEND FXX VERIFIED — READY FOR FYY` and **STOP**.
