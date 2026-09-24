# Frontend route map

Status: **F11 CURRENT / NOT STARTED** — Client F04–F09 and Trainer F10 are VERIFIED. F11 is the complete Admin Workspace (not dashboard-only). F12–F14 remain planned.

Guards are UX. Backend remains authority.

Unsupported capabilities are omitted: registration, password reset, chat, payments, public exercise marketplace, Client exercise library.

## Public

| Path | Purpose | API |
| --- | --- | --- |
| `/login` | Sign in | `POST /api/v1/auth/login` |
| `/` | Redirect: login or role home | `GET /api/v1/auth/me` when session memory/refresh exists |

No public marketing site in V1.

## Client (`role === CLIENT`)

Layout: bottom nav on ordinary Client screens. **Focus Mode** (`/client/workout/$sessionId`) hides bottom nav and the More sheet.

| Path | Purpose | API |
| --- | --- | --- |
| `/client` | Redirect to dashboard | |
| `/client/dashboard` | Home (F04) | `GET /api/v1/clients/me/dashboard?periodDays=7` |
| `/client/training` | Training hub (F05): resume IN_PROGRESS session or start a current-plan workout | `GET /api/v1/clients/me/workout-sessions/current`, `GET /api/v1/clients/me/training-plans/current`, `POST /api/v1/clients/me/workout-sessions` |
| `/client/workout/$sessionId` | Focus Mode (F05): record sets, local rest timer, complete or cancel | `GET /api/v1/clients/me/workout-sessions/:sessionId`, `PUT .../exercises/:sessionExerciseId/sets`, `PATCH .../status` |
| `/client/progress` | Progress overview + exercise list. Search `?period=7\|30\|90\|180\|365` → UTC `dateFrom`/`dateTo` | `GET /api/v1/clients/me/progress/summary`, `GET .../progress/exercises`, `GET .../body-measurements` |
| `/client/progress/exercises/$exerciseId` | Exercise history + trend (lazy). Same `period` search | `GET /api/v1/clients/me/progress/exercises/:exerciseId` |
| `/client/body` | Measurements (create/patch, no delete) + private progress photos, signed access, compare. Not a separate `/client/photos` route. | `GET/POST/PATCH /clients/me/body-measurements`; `POST .../progress-photos/upload-requests`; storage POST; `POST .../finalize`; `GET` list/access; `DELETE` photo |
| `/client/nutrition` | Current prescribed plan (F07). Empty when `nutritionPlan` is null. Not intake logging. | `GET /api/v1/clients/me/nutrition-plans/current` |
| `/client/check-ins` | Latest + history + create draft | `GET/POST /clients/me/check-ins` (summaries omit long text) |
| `/client/check-ins/$checkInId` | Draft edit/submit; submitted/reviewed read-only + Trainer feedback | `GET/PATCH /clients/me/check-ins/:id`, `PATCH .../status`, `DELETE` draft |
| `/client/notifications` | Inbox | `/notifications` |
| `/client/profile` | Self | `GET/PATCH /clients/me`, `GET /clients/me/trainer` |

## Trainer (`role === TRAINER`)

Layout: desktop sidebar + mobile Sheet (F03 ProductivityShell). Client context header + tabs when a Client is open.

F03 sidebar labels are unchanged. Nested Client URLs are not extra sidebar items.

| Path | Purpose | API |
| --- | --- | --- |
| `/trainer` | Redirect to dashboard | |
| `/trainer/dashboard` | Attention queue, counts, recent sessions. Optional `?inactivityDays=7\|14\|30` | `GET /trainers/me/dashboard` (`trainerDashboardGetMine`) |
| `/trainer/clients` | Assigned Clients table/cards. Search, page, plan/check-in filters | `GET /trainers/me/reports/clients` (`trainerDashboardListAssignedClients`) |
| `/trainer/clients/$clientId` | Persistent Client context (Overview) | `GET /trainers/me/clients/:clientId` |
| `/trainer/clients/$clientId/training` | Training plans | `GET/POST /clients/:clientId/training-plans` |
| `/trainer/clients/$clientId/training/$planId` | Workouts from templates, exercise PATCH, status | `GET` plan; `PUT .../workouts`; `PATCH .../exercises/:id`; `PATCH .../status` |
| `/trainer/clients/$clientId/progress` | Progress facts. `?period=` → `dateFrom`/`dateTo` | `GET /clients/:clientId/progress/summary`, `.../exercises`, body measurements |
| `/trainer/clients/$clientId/progress/exercises/$exerciseId` | Exercise trend | `GET /clients/:clientId/progress/exercises/:exerciseId` |
| `/trainer/clients/$clientId/body` | Measurements + READY photos (403 omits photo UI). Not a separate `/photos` route | `GET .../body-measurements`; `GET .../progress-photos`; `GET .../access` |
| `/trainer/clients/$clientId/nutrition` | Prescribed plans (not intake) | `GET/POST /clients/:clientId/nutrition-plans` |
| `/trainer/clients/$clientId/nutrition/$planId` | Targets, meals, foods, status | `PUT .../meals`; `PATCH .../status` |
| `/trainer/clients/$clientId/check-ins` | SUBMITTED/REVIEWED only | `GET /clients/:clientId/check-ins` |
| `/trainer/clients/$clientId/check-ins/$checkInId` | Review | `GET` detail; `POST/PATCH .../review` |
| `/trainer/check-ins` | Pending SUBMITTED queue (dashboard items) | `GET /trainers/me/dashboard` |
| `/trainer/training` | Workout templates | `GET/POST /workout-templates` |
| `/trainer/training/$templateId` | Template exercises + status | `GET`; `PUT .../exercises`; `PATCH .../status` |
| `/trainer/nutrition` | Foods catalog | `GET/POST /nutrition/foods` |
| `/trainer/exercises` | Exercise catalog | `GET/POST /exercises` |
| `/trainer/exercises/$exerciseId` | Detail + owner media upload/delete | `GET /exercises/:id`, `GET .../media`; owner: `POST .../media/upload-requests`, storage POST, `POST .../finalize`, `DELETE .../media/:mediaId` |
| `/trainer/notifications` | F12 placeholder | none |

Not implemented as routes: `/trainer/clients/$clientId/sessions` (recent sessions on Overview), `/trainer/clients/$clientId/photos` (Body tab), `/trainer/templates` (use `/trainer/training`), `/trainer/foods` (use `/trainer/nutrition`), `/trainer/profile`.


Pending check-ins across clients: surface on dashboard (already in trainer dashboard read model); deep-link into `$clientId/check-ins`.

## Admin (`role === ADMIN`)

Layout: sidebar. No decorative 3D.

| Path | Purpose | API |
| --- | --- | --- |
| `/admin` | Redirect to dashboard | |
| `/admin/dashboard` | Counts only. Does not surface `notifications.unreadCount` (F12). | `GET /admin/dashboard` (`adminDashboardGetSystem`) |
| `/admin/trainers` | List/create | `GET/POST /trainers` |
| `/admin/trainers/$trainerId` | Detail, edit, status | `GET/PATCH /trainers/:id`, `PATCH .../status` |
| `/admin/clients` | List/create | `GET/POST /clients` |
| `/admin/clients/$clientId` | Detail, edit, status, set/end trainer, assignment history | `GET/PATCH /clients/:id`, status; `GET/PUT/DELETE .../trainer`; `GET .../trainer-history` |
| `/admin/assignments` | Operational assignment table (active Clients + current trainer) | `GET /clients` + `GET /clients/:id/trainer` |
| `/admin/exercises` | Catalog | `GET/POST /exercises` |
| `/admin/exercises/$exerciseId` | Detail, status, Admin media upload/delete | `GET/PATCH /exercises/:id`, status; `POST .../media/upload-requests`; storage POST; `POST .../finalize`; `GET .../media`; `GET .../access`; `DELETE .../media/:mediaId` |
| `/admin/foods` | Foods catalog | `GET/POST /nutrition/foods` |
| `/admin/foods/$foodId` | Detail, status | `GET/PATCH /nutrition/foods/:id`, status |
| `/admin/notifications` | F12 placeholder | none |

Admin check-in **review** is not an API capability (TRAINER only). Admin may read check-ins; F11 does not clone Trainer Client-context tabs (`/admin/clients/$clientId/**` inspection) so Admin stays identity/assignment/catalog operations rather than a second coaching workspace.

Not implemented as Admin routes: `/admin/clients/$clientId/assignment` (assignment lives on the Client profile), nested progress/body/nutrition/training/check-in inspection, workout-template builder, notification inbox.

## Explicitly out of scope (no routes)

- `/register`, `/forgot-password`
- `/client/exercises` library
- `/client/templates`
- `/trainer/clients/new` (Admin creates clients)
- Chat, billing, email settings
