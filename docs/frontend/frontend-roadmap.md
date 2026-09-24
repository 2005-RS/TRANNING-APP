# Frontend roadmap

Canonical F00–F14 plan for `/frontend`. Backend V1 is complete and is the contract authority.

Status values: **VERIFIED** · **CURRENT / NOT STARTED** · **PLANNED**

Do not mark a phase implemented unless it is VERIFIED.

Visual polish between phases does not change this document’s status.

Related: [current-task.md](./current-task.md) · [quality-gates.md](./quality-gates.md) · [engineering-guardrails.md](./engineering-guardrails.md) · [frontend-architecture.md](./frontend-architecture.md) · [role-ux.md](./role-ux.md)

## Product panels

**Primary end-user workspaces** (both must reach a complete, production-quality experience before this frontend roadmap is considered complete):

1. **CLIENT panel**
2. **TRAINER panel**

**ADMIN** remains required (identity, assignments, catalogs). It is operational, not the primary athlete/coach product.

Do not treat F10 as “Trainer Dashboard only”. F10 is the complete **Trainer Workspace**. Do not implement Trainer domain features during Client phases (F04–F09, F12 Client inbox). Record the corresponding Trainer capability for F10 instead.

Trainer functionality is constrained by generated OpenAPI. If the backend does not support a Trainer capability, document the gap. Do not invent frontend-only management.

## Client / Trainer relationship

| CLIENT | TRAINER (F10, contract-permitting) |
| --- | --- |
| Views assigned training; executes workouts (F05) | Creates/manages Client training; templates where applicable |
| Views nutrition (F07) | Creates/manages Client nutrition |
| Views progress (F06) | Reviews Client progress |
| Views body progress (F06 summary; F08 full) | Reviews Client body progress |
| Submits check-ins (F09) | Reviews check-ins |
| Receives notifications (F12) | Receives relevant notifications; Client list/detail/dashboard |

Trainer **complements** Client. Do not duplicate Client gym UX inside Trainer. Trainer is productivity-oriented and desktop-first.

---

## F00 — Architecture, Design System & UX Foundation

**Status:** VERIFIED

**Objective:** Lock architecture, design tokens, role UX, API-contract rules, and dependency decisions before product UI.

**Included:** Docs under `docs/frontend/`; Cursor frontend/backend standards; stack and token direction.

**Excluded:** Runtime app code, package installs, feature screens.

**Dependencies:** Backend V1 contract exists.

**Completion criteria:** Architecture docs exist and later phases follow them.

---

## F01 — Frontend Foundation

**Status:** VERIFIED

**Objective:** Bootable Vite + React 19 app with tokens, Orval, fetch mutator, Query, Router skeleton, Vitest.

**Included:** `/frontend` toolchain, `src/generated/` pipeline, env schema, shared UI primitives needed to boot.

**Excluded:** Auth UX (F02), role shells (F03), domain features.

**Dependencies:** F00.

**Completion criteria:** App builds; Orval generates; foundation tests/lint pass.

---

## F02 — Authentication & Session Experience

**Status:** VERIFIED

**Objective:** Login and session lifecycle against the real auth contract.

**Included:**

- `AuthSessionProvider`
- States: `BOOTSTRAPPING`, `AUTHENTICATED`, `UNAUTHENTICATED`
- Access token in memory only
- HttpOnly refresh cookie, `credentials: 'include'`
- Single-flight refresh, retry failed request once, no refresh recursion
- Query-cache clearing on logout / user change

**Excluded:** Register, password reset, role shells beyond post-login redirect.

**Dependencies:** F01.

**Completion criteria:** Login, refresh, logout, and token-memory rules verified with tests.

---

## F03 — App Shell, Role Navigation & Protected Routes

**Status:** VERIFIED

**Objective:** Role-correct shells and navigation.

**Included:**

- Client mobile shell + bottom navigation
- Trainer productivity shell (sidebar + mobile Sheet)
- Admin productivity shell (sidebar + mobile Sheet)
- Role-based route protection (UX only; backend authorizes)
- Safe return-to
- Route-level code splitting

**Excluded:** Domain dashboards beyond placeholders; workout Focus Mode (F05).

**Dependencies:** F02.

**Completion criteria:** Role routing, shells, and split chunks verified.

---

## F04 — Client Dashboard

**Status:** VERIFIED

**Objective:** Client Home using the real dashboard contract.

**Included:**

- Route `/client/dashboard`, lazy-loaded
- `GET /api/v1/clients/me/dashboard` / generated `clientDashboardGetMine`
- Real fields: `trainingPlan`, `nutritionPlan`, `currentWorkoutSession`, `recentTraining`, `performance`, `bodyProgress`, `checkIn`
- Loading, error, and empty states
- Greeting from session `firstName` (no extra `/auth/me`)

**Excluded:**

- Workout execution (F05)
- Charts (F06)
- Nutrition logging (F07)
- Body/photo workflows (F08)
- Check-in forms (F09)
- Notification inbox / unread badge (F12). `unreadCount` exists on the DTO but F04 must not surface it.

**Dependencies:** F03.

**Completion criteria (verified):**

- Real backend Client dashboard contract
- 17 test files passed / 67 tests passed
- lint passed / build passed / API generation passed
- Playwright passed with intentional credential-dependent skips
- dashboard route lazy-loaded
- Client Dashboard chunk approximately 55.7 kB raw at F04 verification
- no new runtime dependencies

---

## F05 — Workout Experience

**Status:** VERIFIED

**Objective:** Mobile Focus Mode, session execution, set recording, rest timer, safe recovery, workout completion.

**Included:** Client workout start/resume/record/complete flows that the generated OpenAPI actually supports.

**Excluded:** F06–F14; backend changes; invented session fields; Trainer/Admin workout editors; 3D; notifications.

**Dependencies:** F04 VERIFIED. Inspect generated workout-session operations before coding.

**Completion criteria (verified):** Focus Mode UX, real session mutations, rest timer, recovery, tests + global quality gate, security review. Externally accepted.

---

## F06 — Progress Analytics, Body Trends & Exercise Visualization

**Status:** VERIFIED

**Objective:** Progress metrics, trends, charts, body-performance analysis, exercise visualization where backend supports it.

**Included:** Client (and later Trainer-read) progress surfaces; Recharts only if justified; 3D only if the contract and F13 rules allow and the feature needs it.

**Excluded:** F05 workout execution; inventing PRs/streaks; Rive; notification inbox.

**Dependencies:** F05 VERIFIED (or explicit user override). Generated `progress` operations.

**Completion criteria (verified):** Honest empty/error states; lazy Recharts on Progress only; 3D deferred; quality gate. Externally accepted.

---

## F07 — CLIENT Nutrition

**Status:** VERIFIED

**Objective:** Client nutrition plans, meals, foods, targets, responsive nutrition UX.

**Included:** Surfaces backed by generated nutrition-plan/food operations.

**Excluded:** Invented calorie logs; payments; Trainer nutrition management (F10). Record F10 pairing: Client Nutrition ↔ Trainer Nutrition Management.

**Dependencies:** F04 at minimum; prefer F05 complete unless the user isolates nutrition.

**Completion criteria (verified):** Current-plan view; honest no-plan/error; no intake logging; quality gate. Externally accepted.

---

## F08 — CLIENT Body Progress & Photos

**Status:** VERIFIED

**Objective:** Client body measurements, history, private progress-photo access, comparison UX.

**Included:** Measurement CRUD and signed photo access as OpenAPI defines.

**Excluded:** Public photo URLs; storing blobs in the SPA; check-in photos unless the contract says so. Trainer body-progress **review** is F10. Record F10 pairing: Client Body Progress ↔ Trainer Client Body Progress Review.

**Dependencies:** F03; object-storage access endpoints must be inspected first.

**Completion criteria (verified):** Private access, expiry/refetch behavior, quality gate. Externally accepted.

---

## F09 — CLIENT Check-ins

**Status:** VERIFIED

**Objective:** Client check-in experience — status, submission, review visibility.

**Included:** Client list/create/edit/submit per generated client check-in operations.

**Excluded:** Trainer review workspace (F10). Do not log Check-In free text. Record F10 pairing: Client Check-ins ↔ Trainer Check-in Review.

**Dependencies:** F03. Review is Trainer-oriented on the backend.

**Completion criteria (verified):** Status UX, submit flow, quality gate. Externally accepted.

---

## F10 — TRAINER Workspace

**Status:** VERIFIED

**Objective:** Complete Trainer productivity workspace — not “Trainer Dashboard” alone. Complements the Client panel without cloning Client gym UX.

**Included** (only where generated OpenAPI supports it; document gaps otherwise):

- Trainer Dashboard
- Assigned Clients, Client list, Client detail / profile context
- Client progress review (F06 pairing)
- Client body-progress review (F08 pairing)
- Training-plan / workout-template management (F05 pairing)
- Nutrition-plan management (F07 pairing)
- Check-in review (F09 pairing)
- Exercise workflows
- Relevant notification integration (full inbox remains F12 if not already covered)
- Responsive Trainer navigation (desktop-first; tablet/phone usable)
- Loading, error, and empty states
- Accessibility
- Filtering/search where the contract supports it
- Tests, Playwright, code splitting, performance, security

**Excluded:** Admin user creation; Client Focus Mode; inventing “create client” if the contract still forbids it; duplicating Client workout execution UI.

**Dependencies:** F03 and verified Client F04–F09. Domain reads/writes as OpenAPI allows. The Client↔Trainer pairings from Training, Progress, Nutrition, Body Progress, and Check-ins are in scope for this workspace, not a later phase.

**Completion criteria (verified):** Production-quality Trainer workspace; IDOR-safe UI; quality gate; unsupported capabilities documented as gaps. Externally accepted.

---

## F11 — Admin Workspace

**Status:** VERIFIED

**Objective:** Complete Admin operational workspace — not “Admin Dashboard” alone. Identity, assignments, and catalogs for the platform.

**Included** (only where generated OpenAPI supports it; document gaps otherwise):

- Admin Dashboard (operational counts only)
- Trainers — list, create, detail, status
- Clients — list, create, detail, status
- Trainer–Client assignments — set, end, history
- Exercises — catalog and media where Admin is authorized
- Foods — catalog
- Other Admin-authorized operations present in generated OpenAPI
- Loading, error, and empty states
- Accessibility
- Filtering/search where the contract supports it
- Tests, Playwright, code splitting, performance, security

**Excluded:** Decorative 3D; Client gym chrome; Trainer check-in review submit (TRAINER-only API); capabilities not in OpenAPI; F12 notification inbox as product work.

**Dependencies:** F03. Preserve verified Client F04–F09 and Trainer F10.

**Completion criteria (verified):** Efficient, complete Admin workspace; quality gate; contract limits recorded as gaps in [api-contract.md](./api-contract.md) (notes 15–19). Externally accepted.

---

## F12 — Notifications

**Status:** CURRENT / NOT STARTED

**Objective:** Notification inbox, unread state, navigation integration.

**Included:** Inbox and unread UX. This is the first phase that may surface dashboard `unreadCount`.

**Excluded:** Push, email, in-app chat.

**Dependencies:** F03. Prefer after primary role homes exist.

**Completion criteria:** Read/unread, deep links where contract supports them, quality gate.

---

## F13 — Motion / 3D / Premium Polish

**Status:** PLANNED

**Objective:** Performance-conscious visual refinement. Functional 3D only where useful. Rive only for special celebratory moments if justified.

**Included:** Motion polish; optional Three.js / R3F / Drei / Rive **only if the phase task authorizes the install**.

**Excluded:** Implementing unfinished F05–F12 features; neon/gaming UI; looping decoration.

**Dependencies:** Feature surfaces to polish must already exist.

**Completion criteria:** Reduced-motion, bundle isolation, quality gate.

---

## F14 — Frontend Hardening / Production

**Status:** PLANNED

**Objective:** Accessibility, performance, bundle review, error handling, security review, production config, E2E, release readiness.

**Included:** Hardening of existing features; production env; E2E expansion.

**Excluded:** New product domains; backend redesign.

**Dependencies:** Intended after F05–F13 (or a subset the user explicitly freezes).

**Completion criteria:** Release-ready report; quality gate; no token-storage regressions. Frontend roadmap completeness also requires production-quality **Client** and **Trainer** panels; Admin remains required but secondary.

---

## Cross-panel mapping (planning only)

Whenever a Client-facing feature ships, keep the Trainer-facing counterpart for F10. Do not implement Trainer management during Client phases.

| Client surface | Trainer counterpart (F10) |
| --- | --- |
| Training / workout execution (F05) | Training-plan / template management |
| Nutrition (F07) | Nutrition-plan management |
| Progress (F06) | Client progress review |
| Body progress (F06 summary, F08) | Client body-progress review |
| Check-ins (F09) | Check-in review |

---

## Known gaps (do not invent data)

Recorded for later phases. Not permission to fake frontend data or change backend in an unauthorized task:

- No register UI/flow
- No password-reset flow
- CLIENT generic exercise/media access may be limited — re-check generated contract per feature
- Trainer cannot create Clients if the contract remains unchanged
- No workout-template clone/duplicate operation
- Owning TRAINER can upload exercise media on exercises they created; ADMIN-owned catalog media stays read-only
- Trainer body review is read-only; photo access may 403
- Dashboard `notifications.unreadCount` exists; F12 owns inbox UI
- Admin dashboard does not render `notifications.unreadCount`
- Admin F11 does not clone Trainer Client-context inspection (`/admin/clients/$clientId/**` progress/body/nutrition/training/check-in). Identity, assignment, and catalogs are in F11; nested fitness inspection would duplicate coaching UX
- ADMIN may mutate workout templates via OpenAPI; F11 UI does not ship a template builder
- Assignment table loads current trainer per Client (no bulk assignment list endpoint)
- `GET/PATCH /trainers/me` profile editor is not in the F10 sidebar

## Advancement

Cursor must **STOP** after a phase report. Update this file and `current-task.md` only after the human accepts the phase in a later task.
