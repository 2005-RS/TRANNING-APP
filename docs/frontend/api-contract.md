# API contract (frontend)

Backend is the source of truth. Inspect live `GET /api/docs-json` in development, or the Nest controllers if the API is down. Do not call third-party APIs.

F00 inspected **backend source** (115 unique `operationId`s: `{Controller}_{method}`).

## Base URL

Public env: `VITE_API_URL` (example development: `http://localhost:3000`). Required — there is no fallback origin. Ports and identity checks: [local-environment.md](./local-environment.md).

All business routes: `{VITE_API_URL}/api/v1/...`

OpenAPI UI: `{VITE_API_URL}/api/docs`  
OpenAPI JSON: `{VITE_API_URL}/api/docs-json`  
Health (no auth): `GET /api/v1/health`

Production Swagger is **off by default**. Generate Orval from a development or CI-exported document, not from a public production docs URL.

## Orval strategy (F01)

- Input: `/api/docs-json` (or a committed snapshot only if CI produces it — prefer live generate in F01 against local API).
- Output: `frontend/src/generated/` — never hand-edit. **Commit** generated clients so production builds stay deterministic without a live OpenAPI server. Regeneration remains `npm run api:generate`.
- HTTP: native **fetch** mutator (no Axios). Query `AbortSignal` is passed as `RequestInit.signal`.
- Generate: types + request functions + **TanStack Query** hooks and query keys.
- Script (F01): `npm run api:generate` — guarded since environment hardening: it verifies the Training OpenAPI identity and stages Orval output before replacing `src/generated/` (see [local-environment.md](./local-environment.md)). Do not run `orval` directly.
- Headers: `Authorization`, `X-Request-Id` (optional, UUID; backend accepts limited IDs).
- Cookie: `credentials: 'include'` for auth cookie on `/api/v1/auth/*`.

Operation IDs are unique (`Auth_login`, `Clients_me`, `Notifications_unreadCount`, …). Use them; do not rename in generated files.

## Auth flow (implement F02; design only here)

```
POST /api/v1/auth/login { email, password }
  → JSON { accessToken, tokenType: "Bearer", expiresIn, user }
  → Set-Cookie HttpOnly refresh (name from env, default refresh_session)
     Path=/api/v1/auth  HttpOnly  Secure(prod)  SameSite=lax|none

Memory: accessToken + user. Never Web Storage.

Authenticated request:
  Authorization: Bearer <accessToken>
  credentials: include

401 on a protected resource (not login):
  if refreshInFlight: await same promise
  else POST /api/v1/auth/refresh  (cookie only; single-flight)
  → new accessToken in JSON + rotated cookie
  → retry original request once

Refresh 401 / network fail:
  clear memory → navigate /login

POST /api/v1/auth/logout     → 204, clear cookie (public + cookie)
POST /api/v1/auth/logout-all → 204, Bearer required
GET  /api/v1/auth/me         → identity
```

Login 401 is **invalid credentials**, not a refresh trigger.

Throttle: login 8/min, refresh 12/min per IP — UI should not hammer refresh.

CORS: frontend origin must be listed in backend `CORS_ORIGIN`. Credentials required.

## Error contract

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": ["name should not be empty"],
  "path": "/api/v1/clients",
  "timestamp": "2026-09-03T20:00:00.000Z",
  "requestId": "uuid"
}
```

| status | code (typical) | UX |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | inline field or form alert |
| 401 | `UNAUTHORIZED` | refresh or login |
| 403 | `FORBIDDEN` | “You cannot do that” — no resource leak |
| 404 | `NOT_FOUND` | not found / no access (same UX) |
| 409 | `CONFLICT` | domain toast or inline (activation, in-progress session, review exists) |
| 429 | `RATE_LIMITED` | wait / retry later |
| 500 | `DATABASE_ERROR` / `INTERNAL_ERROR` | generic copy + collapsible `requestId` |

Never show stack traces. Map `message: string[]` from class-validator.

## Pagination

Lists use `{ data, meta: { page, limit, totalItems, totalPages } }`.

Query: `page` ≥ 1, `limit` bounded by backend max. Put page/sort in the URL for Trainer/Admin tables. Never fetch the full collection to paginate in memory.

## Signed media

Private bucket. No permanent public URLs.

| Domain | Who | Flow |
| --- | --- | --- |
| Exercise media | ADMIN, TRAINER | upload-request → POST to storage → finalize → READY → GET access (short TTL) |
| Progress photos | CLIENT upload; ADMIN/TRAINER read assigned | same pattern |

Frontend image component (F08): skeleton, on 403/expiry refetch `.../access`, never persist signed URLs in storage or logs.

HEAD does not verify magic bytes (backend limitation). Still display MIME/size errors from the API.

## Backend authority

Frontend Zod is UX. PostgreSQL uniqueness and assignment checks win. 409 after a double-submit is expected (parallel session start, plan activate, check-in review).

## Endpoint groups (not a full 115-row catalog)

| Group | Prefix | Roles |
| --- | --- | --- |
| Auth | `/auth` | public login/refresh/logout; Bearer me/logout-all |
| Health | `/health` | public |
| Trainers | `/trainers` | ADMIN CRUD; TRAINER `me` |
| Clients | `/clients` | ADMIN CRUD; CLIENT `me` |
| Assignments | `/clients/:id/trainer`, `/trainers/me/clients` | ADMIN mutate; TRAINER list assigned; CLIENT see own trainer |
| Exercises + media | `/exercises` | ADMIN, TRAINER |
| Templates | `/workout-templates` | ADMIN, TRAINER |
| Training plans | `/clients/:id/training-plans`, `/clients/me/training-plans` | write ADMIN/TRAINER; CLIENT read |
| Sessions | `/clients/me/workout-sessions`, `/clients/:id/workout-sessions` | CLIENT write; ADMIN/TRAINER read |
| Progress | `/clients/me/progress`, `/clients/:id/progress` | CLIENT self; ADMIN/TRAINER assigned |
| Measurements | `/clients/me/body-measurements`, `/clients/:id/...` | CLIENT write; others read |
| Photos | `/clients/me/progress-photos`, `/clients/:id/...` | CLIENT write; others read + access |
| Foods | `/nutrition/foods` | ADMIN, TRAINER |
| Nutrition plans | `/clients/:id/nutrition-plans`, `/clients/me/...` | write ADMIN/TRAINER; CLIENT read |
| Check-ins | `/clients/me/check-ins`, `/clients/:id/check-ins` | CLIENT lifecycle; TRAINER review; ADMIN read |
| Dashboards | `/clients/me/dashboard`, `/trainers/me/dashboard`, `/admin/dashboard`, `/trainers/me/reports/clients` | role-specific |
| Notifications | `/notifications` | own inbox all roles |

### Contract notes for UX (do not silently “fix” in backend during frontend work)

1. **No self-registration, no password reset** — do not invent those routes.
2. **CLIENT has no `/exercises` or exercise media API** — workout UI uses plan/session snapshots. F06 Progress exercise detail is a polished info layout; do not call Trainer/Admin media endpoints.
3. **Client Progress windows are `dateFrom`/`dateTo`**, not `periodDays`. Frontend `?period=` is mapped to inclusive UTC calendar days. Summary is an aggregate; exercise `trend` and body-measurement history are the time series.
4. **Client Nutrition is a prescribed plan**, not intake. `GET /clients/me/nutrition-plans/current` returns `{ nutritionPlan: null }` when none is assigned. Totals are meal-item snapshots. CLIENT does not call `/nutrition/foods`. Trainer writes plans via `/clients/:clientId/nutrition-plans` (F10). Trainer `/trainer/nutrition` is the foods catalog, not intake.
5. **Progress photos use short-lived signed GET URLs.** List metadata never includes `storageKey` or URLs. Frontend refetches `GET .../progress-photos/:id/access` on expiry/error and must not persist or log those URLs. Upload is Client-only (upload-request → storage POST → finalize). Trainer review uses list + access only; 403 omits photo UI.
6. **TRAINER cannot POST `/clients`** — Admin creates clients.
7. **Check-in review is TRAINER-only** (not Admin). CLIENT owns `/clients/me/check-ins` lifecycle (`DRAFT` → `SUBMITTED`). Trainer lists omit DRAFT (`status=DRAFT` is 400). Review POST sets `REVIEWED` in one transaction. Do not log Check-In free text. Do not render `reviewedByUserId`.
8. **Admin dashboard is operational counts**, not another user’s private metrics.
9. Refresh cookie **Path** is `/api/v1/auth` only.
10. **Client check-in list summaries omit response text.** Detail GET is required for notes and Trainer feedback. Period max span is 31 days. Submit requires at least one substantive response (rating, adherence including 0, or non-whitespace text). Repeat SUBMITTED is idempotent.
11. **Trainer mutations must not invalidate Client `/clients/me` query keys.** Cross-session Client devices see plan/review changes on the next fetch (`staleTime` 60s).
12. **Trainer dashboard `notifications.unreadCount` is not an inbox.** F12 owns the inbox. Do not badge it in F10.
13. **Exercise media upload is ADMIN or owning TRAINER.** Flow is upload-request → private-bucket signed POST → finalize. TRAINER UI must hide upload/delete when `createdByUserId` is not the session user. ADMIN may attach media to any ACTIVE catalog exercise. Do not persist or log signed URLs. CLIENT still has no `/exercises` media API.
14. **Admin dashboard `notifications.unreadCount` is not an inbox.** F12 owns the inbox. Do not badge or render that count in F11. Admin dashboard remains operational counts only.

#### F11 documented gaps (non-blocking; do not work around in the frontend)

15. **No Admin endpoint lists a Trainer's Clients.** `/trainers/me/clients` is TRAINER-self only. Admin Trainer detail points to client profiles and the Assignments page instead of inventing a list.
16. **No bulk assignment read.** `/admin/assignments` pages `GET /clients` (10 per page) and calls `GET /clients/{clientId}/trainer` once per row. Keep the page size bounded; a bulk endpoint would be a backend change.
17. **Trainer picker is capped at 100.** `GET /trainers` `limit` max is 100. The assignment Sheet queries `status=ACTIVE` with a debounced server-side `search` so larger rosters stay reachable.
18. **No Admin DELETE** for Trainers, Clients, Exercises, or Foods. Lifecycle is status only (`PATCH …/status`: DISABLED / ARCHIVED). Exercise **media** does support DELETE.
19. **`GET /admin/dashboard?periodDays=` affects one metric.** Only `completedWorkoutSessions` is period-scoped; all other counts are current totals. The UI places the period selector beside that metric only.

## Query key examples (Orval-first)

Prefer generated keys. Conceptual invalidation:

```
login success → user/me
PUT sets → workout session detail + current + dashboard + progress
PATCH plan status ACTIVE → client current plan + trainer dashboard
PATCH check-in draft / status SUBMITTED → `/api/v1/clients/me/check-ins` + detail + dashboard
F10 Trainer review POST/PATCH → `/api/v1/clients/:clientId/check-ins` + detail + trainer dashboard pendingCheckIns
(Client app learns of review via 60s staleTime / next visit; cannot invalidate another user's cache)
```

Do not invent `["clientStuff"]`.
