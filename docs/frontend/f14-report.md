# Phase Report

## 1. Summary

F14 (Line A) hardens the Training App SPA and backend for production without deploying. Shipped: accessibility gating, bundle/Lighthouse baseline, global error handling and CSP policy, expanded E2E, the four known product gaps (password reset, Trainer profile, template duplicate, Admin unread count), and production artifacts (frontend image with SPA fallback, storage health check, deploy documentation). This report does **not** change `current-task.md` or the roadmap status; that is a human decision.

## 2. Scope Implemented

- **A3** `@axe-core/playwright` on Client / Trainer / Admin / notifications E2E; serious/critical violations fail the suite; keyboard coverage. Line B routes reported only.
- **A4** Bundle visualizer, Recharts/Motion/WebGL kept off the entry chunk, idle progress-photo skeletons stopped, Lighthouse recorded in `docs/frontend/performance.md`.
- **A5** `AppErrorBoundary`, classified 401/403/404/500/offline, `AUTH_E2E_SKIP_THROTTLE` ignored (and refused) in production, SPA CSP written in `docs/frontend/security-review.md`.
- **A7** Trainer (create template, assign plan, review check-in), Admin (create trainer, assign, disable), notifications E2E.
- **A8.1** Password reset: `password_reset_tokens`, SMTP (`log` outside production), `POST /auth/forgot-password` (202) and `POST /auth/reset-password` (204), SPA screens, fragment token, anti-enumeration.
- **A8.2** Trainer profile editor on `GET/PATCH /trainers/me` with sidebar entry.
- **A8.3** `POST /workout-templates/:id/duplicate` (201 DRAFT owned by caller) and Duplicate on the template detail page.
- **A8.4** Admin dashboard renders the signed-in admin's `notifications.unreadCount` and links to `/admin/notifications`.
- **A6** `frontend/Dockerfile` + nginx SPA fallback and CSP; single-origin topology; `TRUST_PROXY`; storage ping on `/api/v1/health`; `docs/frontend/deploy.md`; seed/`ts-node` and missing Vital pack documented; release checklist.

Not done (explicit): live cloud deploy, register UI, nutrition/landing (Line B), compiling seed scripts into the runtime image, importing the Vital pack.

## 3. Backend Contract Used

Generated operations only. No invented DTO fields.

- Auth: existing session + new `authForgotPassword` / `authResetPassword`.
- Trainers: `trainersMe` / `trainersUpdateMe`.
- Workout templates: `workoutTemplatesDuplicate` + `DuplicateWorkoutTemplateDto`.
- Admin dashboard: existing `notifications.unreadCount` on `AdminDashboardResponseDto`.
- Health: Terminus body gained `info.storage`; frontend does not consume it.

`frontend/src/generated/**` was regenerated with `npm run api:generate` (staging swap) for A8.1 and A8.3. No hand-edits.

## 4. Architecture Decisions

Feature folders: `features/password-reset`, Trainer profile under `trainer-workspace`, duplicate on `trainer-template-detail-page`, Admin unread on `admin-dashboard-page`. SPA served by nginx with `try_files` because the router uses `createBrowserHistory()`. API and SPA share one origin behind a reverse proxy so the refresh cookie can stay `SameSite=Lax`.

## 5. UX / Visual Decisions

CLIENT remains mobile-first; TRAINER/ADMIN desktop-first productivity. Duplicate and unread count use existing surfaces, Geist Mono tabular numbers, and no invented health labels. Password-reset copy is anti-enumerative.

## 6. Loading / Error / Empty States

Existing skeletons and `mapApiError` kinds. Forgot-password always shows a neutral “check your email” state. Duplicate failures are inline alerts. Admin unread `0` still shows the inbox link. Health 503 stays sanitized.

## 7. Authentication / Authorization Integration

Access token memory-only; refresh HttpOnly cookie path `/api/v1/auth`. Reset token lives in the URL fragment, is stripped after read, never logged. Duplicate requires TRAINER/ADMIN read access on the source. Password reset revokes sessions on success. UI guards remain UX only.

## 8. Query Strategy

Generated TanStack Query hooks. Trainer `staleTime` 60s. Duplicate invalidates trainer template keys then navigates to the new id. Admin dashboard continues to use `useAdminDashboardGetSystem`; unread is that payload, not a second `/notifications/unread-count` fetch.

## 9. Mutation Strategy

No optimistic writes. Duplicate POST then invalidate. Profile PATCH writes `null` for emptied optional fields. Password reset uses 202/204 empty bodies (`apiFetch` parses empty JSON as `undefined`).

## 10. Responsive Design

Client 320–430 covered by existing E2E overflow tests. Trainer template detail Duplicate sits in `PageActions` (full width on small screens). Admin dashboard figure wraps in the programs grid. SPA fallback is required for deep links at every width.

## 11. Accessibility

Axe serious/critical = fail (A3). Duplicate button has visible text plus icon `aria-hidden`. Unread count is a labeled figure plus a named inbox link (not color-only). CSP `script-src` hash covers the inline theme script; `prefers-reduced-motion` unchanged.

## 12. Performance / Code Splitting

Entry still excludes Recharts, Motion, and WebGL `TraceField` (see `docs/frontend/performance.md`). Template detail and Admin dashboard remain lazy route chunks. Frontend image serves hashed `/assets/*` immutable and `index.html` no-cache.

## 13. Security Review

- Token: memory; refresh cookie HttpOnly.
- Logging: `safe-log` / redaction; reset tokens and signed URLs not logged.
- Password reset: anti-enumeration, single-use digest, fragment token, session revoke.
- Helmet on API; SPA CSP in nginx (`docs/frontend/security-review.md`). Hash for the inline script (LF): `sha256-gq8zQQX10dMH/2iO9XKuI+tsm3uYzrZXWjG9bKrPmDQ=`.
- `TRUST_PROXY=true` required behind the proxy.
- `AUTH_E2E_SKIP_THROTTLE` cannot disable throttles in production.
- Credentials never in git or `VITE_*`.

## 14. API Generation

Ran for A8.1 and A8.3 against the live OpenAPI document via the guarded staging pipeline. A6 did not change the contract. No hand-edits under `src/generated/`.

## 15. Tests

Frontend Vitest (A8.4 / A6 window): **67 files, 407 tests passed**.

Backend (A6): `storage.health.spec.ts` + `memory-object-storage.adapter.spec.ts` **4 passed**; `test/health.e2e-spec.ts` **1 passed**; `npm run lint` and `npm run build` passed. Earlier A8.3: workout-templates e2e **14 passed**. Full backend e2e was green after A8.1 (163).

No skipped unit tests in these runs.

## 16. Browser E2E

Canonical config: Playwright `channel: 'chrome'`, suite-owned `vite preview` on 4173.

This machine has Microsoft Edge, not Google Chrome. Local verification used `playwright.local.config.ts` with `channel: 'msedge'` (gitignored). Results this session:

- `e2e/trainer-workspace.spec.ts`: **20 passed**, 1 skipped (real-backend smoke)
- `e2e/admin-workspace.spec.ts` “admin manages platform…”: **1 passed** (includes unread + Open inbox)

CI on branch `Eli` runs `channel: 'chrome'`. A8.2 (`16231a3`) CI conclusion **success**. A8.3/A8.4/A6 runs were pushed after that; operators should confirm those GitHub checks before merging.

## 17. Lint

Frontend `npm run lint` (eslint .): **0 errors** (A8.4). Backend `npm run lint`: **0 errors** (A6).

## 18. Build

Frontend `tsc -b && vite build` with `VITE_API_URL=http://localhost:3000`: **passed** (A8.4). Backend `nest build`: **passed** (A6).

The CI frontend build is **not** a production artifact (`VITE_API_URL` is localhost). Production requires a separate image build as in `docs/frontend/deploy.md`.

## 19. Dependencies Added

F14 overall (not A6): `@axe-core/playwright`, `rollup-plugin-visualizer` (frontend dev), `nodemailer` (backend, A8.1, justified in `backend/docs/security.md`).

**A6: NONE.**

## 20. Files Created

A6:

- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/docker/nginx.conf.template`
- `docs/frontend/deploy.md`
- `docs/frontend/f14-report.md`
- `backend/src/health/storage.health.ts`
- `backend/src/health/storage.health.spec.ts`

Earlier F14 product gaps (already on `Eli`): password-reset feature, Trainer profile page, duplicate DTO/endpoint, generated `duplicateWorkoutTemplateDto.ts`, migration `password_reset_tokens`.

## 21. Files Modified

A6: `backend/src/health/health.controller.ts`, `health.module.ts`, `storage/object-storage.types.ts`, `memory-object-storage.adapter.ts`, `s3-compatible-object-storage.adapter.ts`, `test/health.e2e-spec.ts`, `backend/.env.example`, `backend/docs/production-runbook.md`, `docs/frontend/local-environment.md`, `docs/frontend/security-review.md`.

A8.4 also updated Admin dashboard, copy, tests, `api-contract.md`, `route-map.md`, `frontend-architecture.md`, `frontend-roadmap.md` known-gaps (not the F14 status line).

## 22. Documentation Updated

- `docs/frontend/deploy.md` (new)
- `docs/frontend/f14-report.md` (this file)
- `docs/frontend/security-review.md` (CSP hash)
- `docs/frontend/local-environment.md` (pointer)
- `backend/docs/production-runbook.md`
- `backend/.env.example`
- Contract/route/architecture/roadmap known-gaps for unread count and closed A8 items

Did **not** advance `docs/frontend/current-task.md` or set F14 to VERIFIED on the roadmap.

## 23. Backend Gaps

- No public register or self-serve signup.
- Seed and exercise import scripts need `ts-node` (not in the pruned image); Vital pack is not in git.
- Admin still has no bulk assignment list and no Trainer-client roster endpoint.
- Client/Trainer dashboards still do not render `notifications.unreadCount` (inbox + nav badge remain F12).
- Nutrition completeness is Line B.

## 24. Remaining Risks

- Confirm GitHub Actions for `326fbb5`, `902fad9`, and this A6 commit before merge.
- CSP hash is LF-specific; Windows CRLF frontend image builds would block the inline theme script. Build images on Linux/CI.
- Local Playwright here used Edge; CI Chrome is the gate that matters.
- First production database has no exercise catalog until the private pack is imported.
- Line B owns login visuals and nutrition; password-reset link on the login page is the documented cross-line touch.

## 25. Phase Decision

```
FRONTEND F14 VERIFIED — READY FOR F15
```

```
STOP.
```
