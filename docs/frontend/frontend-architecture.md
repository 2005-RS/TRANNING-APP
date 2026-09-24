# Frontend architecture

Temporary product name: **Training Platform**. Branding is token-driven; no logo is defined in F00.

This document is the implementation contract for F01 onward. It does not install packages or create UI.

## Why React + Vite

The backend is a versioned REST API (`/api/v1`) with OpenAPI, cookie-based refresh, and a separate browser origin in development. A SPA that:

- talks to that contract through generated clients
- keeps the access token in memory
- code-splits trainer/admin and 3D away from the Client gym shell

is the right fit. Next.js SSR/RSC would not help HttpOnly-cookie refresh against a separate API origin, would complicate TanStack Query as the server-state layer, and is unnecessary for a role-gated training app with no public SEO catalog.

Vite + React 19 + React Compiler is the F01 foundation.

## Layers

```
UI (routes + feature components)
    ↓
Feature hooks (compose Query/Form; no raw HTTP)
    ↓
Orval-generated TanStack Query hooks / fetch functions
    ↓
shared fetch mutator (Bearer memory + credentials + single-flight refresh)
    ↓
NestJS /api/v1
```

| Layer | Owns |
| --- | --- |
| TanStack Router | URL, search params, route loaders, role-aware layouts |
| TanStack Query | Server cache, pagination, invalidation |
| TanStack Form + Zod | Form draft state and client UX validation |
| React state | Hover, timers, sheet open, workout keypad |
| CSS variables | Theme (dark / light / system) |

No Redux. No Zustand in F01–F03. Revisit only if several features need shared ephemeral client state that is not URL and not server cache (unlikely).

## Folder structure

Implemented under repository `/frontend` (F01). Backend remains `/backend`. Do not place React code inside the NestJS tree.

```
frontend/
├── index.html
├── vite.config.ts
├── orval.config.ts          # F01
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── providers.tsx    # QueryClient, theme, toaster
│   │   ├── router.tsx
│   │   └── shells/          # F03 Client/Trainer/Admin layouts
│   ├── routes/              # TanStack Router file tree
│   ├── features/
│   │   ├── auth/
│   │   ├── navigation/      # F03 nav config, placeholders
│   │   ├── client-dashboard/  # F04 Client Home
│   │   ├── dashboard/
│   │   ├── workout-session/
│   │   ├── training-plans/
│   │   ├── progress/
│   │   ├── body-progress/
│   │   ├── progress-photos/
│   │   ├── client-body/     # F08 measurements + private photos
│   │   ├── client-check-ins/ # F09 Client check-ins
│   │   ├── trainer-workspace/ # F10 Trainer Workspace
│   │   ├── admin-workspace/   # F11 Admin Workspace
│   │   ├── notifications/     # F12 inbox placeholder
│   ├── shared/
│   │   ├── ui/              # shadcn primitives + AppShell, DataTable
│   │   ├── lib/             # api-mutator, access-token memory, cn()
│   │   ├── config/          # env schema (public only)
│   │   └── errors/          # map ErrorResponseDto → UX
│   ├── generated/           # Orval output — never edit
│   ├── styles/
│   │   └── tokens.css       # semantic CSS variables
│   └── assets/
├── tests/
└── e2e/
```

Do not create a flat `components/` dumping ground.

Empty feature folders are not required in F00. F01 may create the tree as empty modules; screens arrive in later tasks.

## Route strategy

Code-based TanStack Router (no file-route plugin in F01–F03) with three authenticated layouts:

- `/login` — anonymous, lazy-loaded
- `/client/**` — `role === CLIENT` (ClientAppShell, bottom nav)
- `/trainer/**` — `role === TRAINER` (ProductivityShell)
- `/admin/**` — `role === ADMIN` (same ProductivityShell, admin nav)

## Product panels (permanent)

**Primary:** CLIENT and TRAINER. Both must reach production quality before the frontend roadmap is complete. ADMIN is required but operational.

Trainer complements Client; it does not clone Client UX. Client phases (F04–F09) must **record** the Trainer management/review counterpart for F10 and must **not** implement Trainer domain screens early.

| Client feature | Trainer counterpart (F10, generated OpenAPI only) |
| --- | --- |
| Training | Training management |
| Nutrition | Nutrition management |
| Progress | Client progress review |
| Body progress | Client body-progress review |
| Check-ins | Check-in review |

If the contract lacks a Trainer capability, document the gap. Do not invent frontend-only management.

Guards (`RequireAuth`) are UX. A TRAINER URL is never a security boundary; the API returns 403/404.

Wrong-role visits redirect to that user's role dashboard. Nested return-to (`/login?redirect=/client/progress`) is honored only when the path belongs to the signed-in role.

Role shells are `React.lazy` imported after the matching guard passes so bootstrap does not download Client + Trainer + Admin together. Placeholder pages share a tiny lazy module. The Client Dashboard (`/client/dashboard`) is its own lazy chunk and must stay out of login and Trainer/Admin shells.

Search params hold list `page`, `limit`, `sort`, filters — not React state — so Trainer/Admin tables are shareable and back-button correct.

## Client Dashboard (F04)

Home for `role === CLIENT`. One generated read:

- `GET /api/v1/clients/me/dashboard?periodDays=7`
- operation `clientDashboardGetMine`
- generated hook `useClientDashboardGetMine`
- generated key `getClientDashboardGetMineQueryKey`

Feature folder: `frontend/src/features/client-dashboard/`.

Query policy: `staleTime` 60s, `refetchOnWindowFocus: false`, retry inherited from the app QueryClient (no retry on 401/403/429). Do not call `/auth/me` again; greeting uses session `user.firstName`. 401 is handled by `apiFetch` single-flight refresh, not by the dashboard page.

Missing dashboard sections are omitted or shown as honest empty states. No invented streaks, PRs, calories, or trainer names. Workout execution is F05 (`/client/training` hub and `/client/workout/$sessionId` Focus Mode). Charts are F06. Nutrition is a prescribed plan view (F07), not intake logging. Check-in forms are F09. Notification inbox is F12 (`unreadCount` is not consumed as a badge in F04).

Loading uses a dashboard skeleton inside the Client shell (not `AppBootScreen`). Errors offer Try again via Query `refetch`. Logout still `queryClient.clear()` (F02).

## Workout Experience (F05)

Client training is a real execution surface, not a placeholder. Feature folder: `frontend/src/features/workout-session/`. Set rows, rest timer, and confirm sheets live in that feature, not `shared/ui`.

Implemented Client routes:

| Path | Role |
| --- | --- |
| `/client/training` | Hub: resume the backend `IN_PROGRESS` session, or start a workout from `GET /api/v1/clients/me/training-plans/current` via `POST /api/v1/clients/me/workout-sessions` |
| `/client/workout/$sessionId` | Focus Mode: `GET` session by id, `PUT` sets for one exercise, `PATCH` status `COMPLETED` / `CANCELLED` |

There is no `/client/workout` index route. Start and resume happen on the hub. Dashboard **Continue training** deep-links to `/client/workout/$sessionId`.

**Focus Mode** hides Client bottom navigation and the More sheet. The compact header keeps Close (back to Training), Appearance, and Account. `--z-workout-focus` sits above ordinary chrome.

**Recovery** is backend-authoritative: `GET /api/v1/clients/me/workout-sessions/current` and `GET .../workout-sessions/{sessionId}`. A UUID in the URL is not authorization; other clients' sessions return 404. Reloading Focus Mode restores the session and recorded sets from those reads.

**Rest timer** is transient UI. Remaining time is `max(0, durationSeconds - floor((now - startedAt) / 1000))` from wall-clock timestamps. It is not written to Web Storage or the API. A refresh resets only the timer; the `IN_PROGRESS` session remains recoverable.

Session start/complete are not optimistic. Set replace waits for the server response, then updates Query cache.

Lazy chunks: `training-hub-page` and `workout-focus-page` stay out of login and Trainer/Admin shells. CLIENT has no `/exercises` media API; the UI uses session prescription snapshots only.

## Client Progress (F06)

Client Progress is a real analytics surface, not a placeholder. Feature folder: `frontend/src/features/client-progress/`. Charts live in that feature (`charts/`), not `shared/ui`.

Implemented Client routes:

| Path | Role |
| --- | --- |
| `/client/progress` | Overview: selected-period summary, previous-period comparison, body measurements, exercise list |
| `/client/progress/exercises/$exerciseId` | Exercise history, backend highest-in-period values, and derived trend points |

Search: `?period=7|30|90|180|365` (invalid values fall back to `30`). The UI labels those windows 7D / 30D / 90D / 6M / 1Y. The API does **not** accept `periodDays`; the client maps the search param to inclusive UTC `dateFrom` / `dateTo`.

Reads (generated Orval hooks, parallel, independent):

- `GET /api/v1/clients/me/progress/summary` — `clientProgressGetSummary`
- `GET /api/v1/clients/me/progress/exercises` — `clientProgressListExercises` (list page only; no per-exercise detail fetch)
- `GET /api/v1/clients/me/progress/exercises/:exerciseId` — `clientProgressGetExercise` (detail route only)
- `GET /api/v1/clients/me/body-measurements` — `clientBodyMeasurementsList` (period window on Progress; create/patch belong to F08 `/client/body`)

Recharts is used only where the contract provides a series: body-weight history and exercise `trend` points. The summary DTO is an aggregate, not a time series, so overview performance is metrics + previous-window comparison, not a fabricated daily chart. Chart modules are `React.lazy` so Recharts stays out of login, Trainer, Admin, and Workout Focus chunks.

Exercise visualization is **level 1** (polished info layout). CLIENT has no generic exercise-media API. 3D is **DEFERRED** to F13. Measurement create/edit and progress photos are F08 (`/client/body`).

Query policy: `staleTime` 120s, `refetchOnWindowFocus: false`. F05 session writes invalidate `/api/v1/clients/me/progress*` keys so completed workouts refresh Progress.

## Client Nutrition (F07)

Client Nutrition is a **prescribed plan view**, not intake tracking. Feature folder: `frontend/src/features/client-nutrition/`. Meal cards live in that feature, not `shared/ui`.

Implemented Client route:

| Path | Role |
| --- | --- |
| `/client/nutrition` | Current ACTIVE plan (`GET /api/v1/clients/me/nutrition-plans/current`). `{ nutritionPlan: null }` is an honest empty state. |

No `/client/nutrition/$planId` in F07. `GET .../nutrition-plans` (list) and `GET .../nutrition-plans/:planId` exist for ACTIVE/ARCHIVED history but are unused until a later task needs archived-plan navigation. CLIENT cannot mutate plans. CLIENT does not call `/nutrition/foods` or Trainer `POST/PATCH /clients/:id/nutrition-plans`.

Reads: `useClientNutritionPlansGetCurrent` / `getClientNutritionPlansGetCurrentQueryKey`. Query policy: `staleTime` 5 minutes, `refetchOnWindowFocus: false`. F10 Trainer mutations must later invalidate `/api/v1/clients/me/nutrition-plans/current` (and list/detail keys if those screens exist).

Targets (`NutritionTargetsDto`) are nullable prescribed values. `mealPlanTotals` are snapshot sums independent of targets. `targetDifferences` is meal total minus target — never labelled remaining/consumed. Item `quantityGrams` is grams only. Food nutrition is snapshot, not live catalog.

No Recharts on Nutrition. No F08 body/photos. Trainer editors live in F10 (`/trainer/clients/$clientId/nutrition`).


F10 pairing: Client views assigned meals/portions ↔ Trainer creates/updates plans, replaces meals, assigns food portions, activates status.

---

## Client Body Progress & Photos (F08)

Client Body is measurement **CRUD-without-delete** plus private progress photos. Feature folder: `frontend/src/features/client-body/`. No `/client/photos` route — photos live on `/client/body` with the More destination.

Implemented Client route:

| Path | Role |
| --- | --- |
| `/client/body` | List/create/patch measurements; list/upload/finalize/access/delete photos; two-photo compare |

Reads/writes (generated Orval only; CLIENT `/clients/me/...` — never Trainer `/clients/:id/...`):

- `GET/POST /api/v1/clients/me/body-measurements` — `clientBodyMeasurementsList` / `clientBodyMeasurementsCreate`
- `PATCH /api/v1/clients/me/body-measurements/:measurementId` — `clientBodyMeasurementsUpdate` (no DELETE in v1)
- `POST /api/v1/clients/me/progress-photos/upload-requests` → browser `POST` to signed storage (no Bearer) → `POST .../finalize`
- `GET /api/v1/clients/me/progress-photos` (`READY` gallery; `PENDING_UPLOAD` / `FAILED` owner status)
- `GET /api/v1/clients/me/progress-photos/:photoId/access` — `{ url, expiresAt }`; refetch on expiry/error; never persist or log
- `DELETE /api/v1/clients/me/progress-photos/:photoId`

Query policy: `staleTime` 60s, `refetchOnWindowFocus: false`. Access queries use short `gcTime` (30s). Writes invalidate `/api/v1/clients/me/body-measurements`, `/api/v1/clients/me/dashboard`, and `/api/v1/clients/me/progress-photos`. Not optimistic. Units: kg, cm, body-fat %. `quantity` is not converted. MIME allowlist jpeg/png/webp; UX max 10 MB (backend `PROGRESS_PHOTO_MAX_BYTES` remains authority). No BMI, scores, or public URLs. No Recharts on this page (charts stay on F06 Progress).

F10 pairing: Client records measurements/photos ↔ Trainer reviews assigned Client body measurements and READY photos via `/clients/:clientId/body-measurements` and `/clients/:clientId/progress-photos` (+ access). Trainer cannot upload or delete.

---

## Client Check-ins (F09)

Client Check-ins are a structured conversation with the Trainer, not an admin form. Feature folder: `frontend/src/features/client-check-ins/`.

Implemented Client routes:

| Path | Role |
| --- | --- |
| `/client/check-ins` | Latest check-in, create draft (period dates), paginated history from summaries |
| `/client/check-ins/$checkInId` | Draft edit/submit; SUBMITTED/REVIEWED read-only; Trainer feedback when `status=REVIEWED` |

Reads/writes (generated Orval only; CLIENT `/clients/me/check-ins` — never Trainer `/clients/:id/check-ins`):

- `POST /api/v1/clients/me/check-ins` — `clientCheckInsCreate` (creates **DRAFT**; `periodStart`/`periodEnd` required)
- `GET /api/v1/clients/me/check-ins` — `clientCheckInsList` (summaries; default `periodStart DESC`)
- `GET /api/v1/clients/me/check-ins/:checkInId` — `clientCheckInsGetOne` (responses + review)
- `PATCH /api/v1/clients/me/check-ins/:checkInId` — `clientCheckInsUpdate` (DRAFT only; 409 otherwise)
- `PATCH /api/v1/clients/me/check-ins/:checkInId/status` — `clientCheckInsUpdateStatus` (`status=SUBMITTED` only)
- `DELETE /api/v1/clients/me/check-ins/:checkInId` — `clientCheckInsRemove` (DRAFT only)

Statuses: `DRAFT` | `SUBMITTED` | `REVIEWED`. Do not infer review from text; use `status`. List `hasReview` is true when REVIEWED.

Writable Client fields (draft): period dates; ratings 1–5 `sleepQuality`, `energyLevel`, `stressLevel`, `hungerLevel`, `recoveryLevel`; adherence 0–100 `trainingAdherencePct`, `nutritionAdherencePct` (self-reported, including 0); text ≤2000 `wins`, `challenges`, `generalNotes`. Read-only: `id`, `status`, `submittedAt`, `review`, `createdAt`, `updatedAt`. Never render `reviewedByUserId`.

Query policy: `staleTime` 60s, `refetchOnWindowFocus: false`, inherit QueryClient retry. Writes invalidate `/api/v1/clients/me/check-ins`, detail key, and `/api/v1/clients/me/dashboard`. Not optimistic. Submit is update-then-status; buttons disable while pending.

No check-in photos (F08 owns progress photos). Do not log Check-In free text. No Recharts.

F10 pairing: Client creates/submits/views own check-ins and feedback ↔ Trainer lists SUBMITTED/REVIEWED for an assigned Client, posts/patches review (`POST/PATCH /clients/:clientId/check-ins/:checkInId/review`). Trainer dashboard `pendingCheckIns` is SUBMITTED only (max 5, oldest first). ADMIN is read-only (403 on review). DRAFT is never returned on Trainer lists.

---

## Trainer Workspace (F10)

Desktop-first coaching software in `frontend/src/features/trainer-workspace/`. Does not import Client gym pages (Focus Mode, Client Nutrition/Body/Check-in screens). Reuses lower-level formatters, progress charts (`LazyProgressChart`), and check-in field labels only.

Implemented Trainer routes (lazy per page):

| Path | Purpose |
| --- | --- |
| `/trainer/dashboard` | Attention: pending check-ins, missing plans, inactivity, recent sessions. Search `?inactivityDays=7\|14\|30` |
| `/trainer/clients` | Assigned Clients via `GET /trainers/me/reports/clients` (search, pagination, plan/check-in filters) |
| `/trainer/clients/$clientId` | Persistent Client header + tabs: Overview, Training, Progress, Body, Nutrition, Check-ins |
| `/trainer/clients/$clientId/training` and `.../training/$planId` | Create DRAFT plans, add workouts from ACTIVE templates, PATCH exercise, activate/archive |
| `/trainer/clients/$clientId/progress` | Summary, exercises, body-weight trend. Search `?period=` → UTC `dateFrom`/`dateTo` |
| `/trainer/clients/$clientId/body` | Measurements read + READY photos via signed GET access (omit UI on 403) |
| `/trainer/clients/$clientId/nutrition` and `.../nutrition/$planId` | Prescribed plans, targets, meals, `quantityGrams` decimals, activate/archive |
| `/trainer/clients/$clientId/check-ins` and `.../check-ins/$checkInId` | SUBMITTED/REVIEWED list; create/update review |
| `/trainer/check-ins` | Pending queue from dashboard `pendingCheckIns` |
| `/trainer/training` and `.../$templateId` | Workout templates |
| `/trainer/nutrition` | Foods catalog |
| `/trainer/exercises` and `.../$exerciseId` | Exercise catalog; owning TRAINER can upload/delete media on exercises they created |
| `/trainer/notifications` | F12 placeholder |

Query policy: `staleTime` 60s, `refetchOnWindowFocus: false`. `clientId` is always in generated keys. Signed photo access: `staleTime` 15s, `gcTime` 30s, memory/query cache only. Mutations invalidate Trainer prefixes (`/api/v1/trainers/me/...`, `/api/v1/clients/:clientId/...`) and **must not** invalidate Client `/api/v1/clients/me`.

Do not surface dashboard `notifications.unreadCount` (F12). TRAINER cannot create Clients.

Backend/OpenAPI gaps (no frontend invention):

- TRAINER cannot create or assign Clients
- No template clone/duplicate operation
- TRAINER may upload/delete exercise media only on exercises they created (`createdByUserId`). ADMIN-owned catalog (e.g. Vital) stays read-only in Trainer UI. Backend already 404s non-owners; UI must not show the uploader.
- No Trainer write for body measurements or progress photos
- No nutrition intake / food logging
- No Trainer profile editor (`GET/PATCH /trainers/me` unused in F10 shell)
- Dashboard has no revenue, engagement score, or AI insights fields
- `CreateNutritionPlanDto` targets and several notes/reps fields are generated as object maps; runtime still sends numbers/strings

---

---

## API layer

Orval generates TypeScript types + `fetch` functions + TanStack Query hooks from `/api/docs-json`.

- Client: native `fetch` (no Axios).
- One mutator in `shared/lib/api-mutator.ts`.
- `credentials: 'include'` so the refresh cookie is sent to `/api/v1/auth/*` (`Path=/api/v1/auth`).
- `Authorization: Bearer <memory access token>` on authenticated calls.
- On 401: single-flight `POST /api/v1/auth/refresh`, update memory token, retry once. If refresh fails: clear memory, redirect `/login`.
- Do not refresh-loop on login 401 (invalid credentials).
- Skip refresh for `/api/v1/auth/login` and `/api/v1/auth/refresh` itself.

Query keys: use Orval-generated keys. Invalidate by domain after mutations (e.g. workout session write → session detail + dashboard + progress queries).

Optimistic updates: allowed later for notification `read` and trivial UI prefs. Forbidden for plan activation, session start/complete, nutrition meal replace, Check-In submit.

## Auth architecture (implement in F02)

See [api-contract.md](./api-contract.md). Access token never touches Web Storage.

## Forms

TanStack Form + Zod for UX. Backend 400 `VALIDATION_ERROR` with `message: string[]` maps onto fields when possible; otherwise a form-level alert.

Nested arrays: template exercises, plan workouts, meals/items, measurement fields. Do not build a mega form generator.

## Testing

| Layer | Tool | When |
| --- | --- | --- |
| Unit | Vitest | tokens, error mapper, refresh mutex, Zod schemas |
| Component | Testing Library | forms, workout set row, tables |
| API mock | MSW from Orval or handwritten handlers matching OpenAPI | Query hooks |
| E2E | Playwright | login, refresh cookie path, role redirect, one Client workout submit |

F01 installs Vitest + Testing Library. Playwright and MSW may wait until F02/F14 if F01 needs a thinner install — prefer installing MSW in F01 so generated mocks have a home. Playwright is **FEATURE-DEPENDENT** on having routes (F02+).

## Performance

- Route-level lazy loading for `/trainer`, `/admin`, charts, 3D.
- Initial Client shell must not import Three.js, Rive, Recharts, or the full admin table stack.
- Lucide: per-icon imports.
- date-fns: per-function imports.
- Images: signed GET URLs only; expiry → refetch access endpoint (F08).

Qualitative budget: gym-phone Client shell stays small; Trainer workspace may be larger after navigation.

## Code splitting map

F03 splits login, Client shell, and Trainer/Admin productivity shells via dynamic `import()`. Hashed chunk names come from Vite.

| Chunk | Contents |
| --- | --- |
| app / index | Providers, router tree, auth gates, boot screen |
| login | Login page, TanStack Form, login Motion |
| shell-client | ClientAppShell, bottom nav, More sheet |
| shell-productivity | Shared sidebar/header used by Trainer and Admin |
| shell-trainer / shell-admin | Role nav config wrappers |
| placeholder pages | Tiny coming-soon route module |
| `client-dashboard` | Client Home (F04) — must stay out of login / trainer / admin |
| `training-hub` / `workout` | F05 hub + Focus Mode — must stay out of shells |
| `client-nutrition-page` | F07 current-plan view — must stay out of login / trainer / admin / workout-focus / progress-chart |
| `client-body-page` | F08 measurements + private photos — must stay out of login / trainer / admin / workout-focus / progress-chart |
| `progress-line-chart` | Recharts (F06 Client Progress) — lazy-loaded from Progress only; must stay out of login / trainer / admin / workout-focus |
| `three` | R3F exercise viewer (F13) — must stay out of shells |
| `rive` | Celebration (F13) |

## i18n readiness

No i18n library in F00/F01. Copy should live in feature `copy.ts` (or later `messages/en.ts`) rather than random JSX literals where practical. Architecture must not assume English-only identifiers in the URL; UI language is a later layer (English + Spanish).

## Related docs

- [design-system.md](./design-system.md)
- [motion-and-3d.md](./motion-and-3d.md)
- [role-ux.md](./role-ux.md)
- [api-contract.md](./api-contract.md)
- [route-map.md](./route-map.md)
- [dependency-decisions.md](./dependency-decisions.md)
