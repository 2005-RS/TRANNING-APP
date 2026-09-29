# Current frontend task

Lightweight state file. Update only after a phase is **externally accepted**.

## Current phase

**F13** — Motion / 3D / Premium Polish

## Task

Premium visual refinement of the public website, login, and the Client, Trainer, and Admin apps (see [frontend-roadmap.md](./frontend-roadmap.md#f13--motion--3d--premium-polish)).

## Status

**F13 Stage 2 COMPLETE** — stage 3 not started

## Stages (user-agreed, 2026-09-25)

1. **Public website + login.** Redesign, plus the animated background on the home hero and the login hero. ✅
2. **Client app.** Motion and surface polish. No looping background. ✅
3. **Trainer + Admin.** Restrained productivity polish. No decorative motion.

Show each stage in the browser before starting the next.

## Previous phase

**F12 VERIFIED** — Notifications (externally accepted 2026-09-25)

## Next planned phase

**F14** — Frontend Hardening / Production

Do not start F14 from an F13 task.

## Current Task Boundaries

- Implement **only F13**.
- Animated background: home hero and login hero only, hand-written WebGL shader, **no new dependency**. Still frame under `prefers-reduced-motion`, paused off screen and in hidden tabs, CSS fallback without WebGL. See [motion-and-3d.md](./motion-and-3d.md#ambient-trace-field).
- Three.js, R3F, Drei, Rive, and Spline are **not** installed by this task.
- Stack stays as in `frontend-standards.mdc`: no second UI or CSS framework.
- Tokens only in features; no raw hex. Geist Sans for UI, Geist Mono for numbers.
- Motion durations follow `--motion-*` tokens. One orchestrated page-load moment, not a reveal on every section.
- Do not change copy meaning, invent capabilities, add sign-up, prices, statistics, or testimonials.
- **Do not modify backend.**
- Keep access tokens in memory; do not change auth storage.
- Do not hand-edit `frontend/src/generated/**`.
- Preserve F02 session behavior, F03 shells, verified Client F04–F09, Trainer F10, Admin F11, and Notifications F12.
- Follow [engineering-guardrails.md](./engineering-guardrails.md) and [quality-gates.md](./quality-gates.md).
- Report with [task-report-template.md](./task-report-template.md), then **STOP**.

## Verified facts to preserve

### F02

- `AuthSessionProvider`
- `BOOTSTRAPPING` / `AUTHENTICATED` / `UNAUTHENTICATED` / `RESTORE_FAILED`
- Timeout/network restore failure is not an authoritative 401
- Single-flight refresh
- Query cache clears between users

### F03

- Client mobile shell + bottom navigation
- Trainer and Admin productivity shells
- Role-based route protection (UX)
- Safe return-to
- Route-level splitting
- Trainer/Admin mobile Sheet

### F04

- `GET /api/v1/clients/me/dashboard`
- Operation `clientDashboardGetMine`
- Uses real: `trainingPlan`, `nutritionPlan`, `currentWorkoutSession`, `recentTraining`, `performance`, `bodyProgress`, `checkIn`
- Does **not** surface notification unread count

### F05

- `/client/training` hub and `/client/workout/$sessionId` Focus Mode
- Backend-authoritative `IN_PROGRESS` recovery; UUID is not authorization
- Transient wall-clock rest timer (not persisted)
- Focus Mode hides Client bottom navigation

### F06

- `/client/progress` and `/client/progress/exercises/$exerciseId`
- Search `?period=` mapped to UTC `dateFrom`/`dateTo` (API has no `periodDays`)
- Recharts lazy on Progress only; 3D deferred to F13

### F07

- `/client/nutrition` prescribed current-plan view
- `{ nutritionPlan: null }` empty state; no intake logging

### F08

- `/client/body` measurements (create/patch, no delete) and private progress photos
- Signed GET access with expiry/refetch; storage POST without the API Bearer token
- No public photo URLs; signed URLs not persisted or logged

### F09

- `/client/check-ins` and `/client/check-ins/$checkInId`
- Client list/create/edit/submit against generated Client check-in operations
- Latest item derived from the list; no duplicate “current” endpoint
- Do not log Check-In free text
- Trainer check-in review is F10 VERIFIED

### F10

- Complete Trainer Workspace (not dashboard-only)
- Trainer dashboard, assigned Clients, Client context + tabs
- Training-plan / workout-template management; nutrition-plan management; progress and body review; check-in review
- TRAINER cannot create Clients; no template clone; photo 403 omits UI
- Trainer mutations must not invalidate Client `/clients/me` keys
- `/trainer/notifications` remains F12 placeholder

### F11

- Complete Admin Workspace (not dashboard-only): dashboard, Trainers, Clients, Assignments, Exercises (+ private media), Foods
- Create/edit in Sheets; detail routes; status changes behind confirmation; no DELETE for these entities (not in contract)
- One active trainer per Client; assignment Sheet lists ACTIVE trainers only and blocks re-selecting the current trainer
- Contract-safe error copy (no raw backend messages); filtered-empty vs truly-empty states
- Narrow invalidation with generated keys; Admin mutations do not touch `/clients/me` keys
- Signed media URLs in component state only; click-to-preview, no autoplay
- Documented contract gaps: [api-contract.md](./api-contract.md) notes 15–19
- `/admin/notifications` remains F12 placeholder
