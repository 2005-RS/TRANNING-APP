# Role UX

Backend roles: `CLIENT`, `TRAINER`, `ADMIN`. Frontend layouts follow the API, not a generic CRM.

IDs are not authorization. Hiding a nav item is UX. The API still 401/403/404.

## Primary product panels

1. **CLIENT panel** — mobile-first athlete workspace. Must reach production quality.
2. **TRAINER panel** — desktop-first coach workspace. Must reach production quality.

The frontend roadmap is not complete until both exist as full experiences. **ADMIN** is required (create users, assignments, catalogs) but is not the primary end-user product.

Trainer **complements** Client: manage and review assigned Clients. Do not duplicate Client gym UX (Focus Mode, large steppers, athlete charts as the happy path) inside Trainer. Trainer is productivity-oriented.

| Client does | Trainer does (F10, OpenAPI-permitting) |
| --- | --- |
| Views assigned training; executes workouts | Creates/manages Client training |
| Views nutrition | Creates/manages Client nutrition |
| Views progress | Reviews Client progress |
| Views body progress | Reviews body progress |
| Submits check-ins | Reviews check-ins |
| Receives notifications | Works with assigned Clients, exercises, and relevant notifications |

If OpenAPI does not support a Trainer capability, document the gap. Do not invent frontend-only management.

---

## CLIENT

### Device

**Mobile-first.** Gym, one hand, motion, sweat. Tablet is a larger phone. Desktop is secondary.

### Goals

1. Start or resume the current workout immediately
2. Log sets with previous performance visible
3. See plan, nutrition, check-in, and progress without administration chrome
4. Upload measurements and progress photos when appropriate
5. Submit check-ins for a chosen period and read Trainer feedback when reviewed

### Navigation

Compact **bottom navigation** (F03):

| Item | Destination | API support |
| --- | --- | --- |
| Home | Client dashboard (F04) | `GET /api/v1/clients/me/dashboard` |
| Training | Training hub + Focus Mode (F05) | current plan, workout-sessions start/current/sets/status |
| Progress | Overview + exercise list / detail | `GET /api/v1/clients/me/progress/summary`, `.../exercises`, `.../exercises/:exerciseId`; body history from `GET /api/v1/clients/me/body-measurements` |
| Nutrition | Current assigned plan (F07) | `GET /api/v1/clients/me/nutrition-plans/current` |
| More | Body progress (F08), check-ins (F09), notifications | body-measurements + progress-photos (F08); `GET/POST/PATCH/DELETE /clients/me/check-ins` (F09); `/notifications` |

Do not use a dense desktop sidebar as the Client primary pattern.

### Density

Low. Large type for the active exercise. Geist Mono for loads/reps/timers. Minimal typing during workout (steppers).

### Interaction

- Workout **focus mode**: hide bottom nav; show exit/minimize
- Thumb-zone primary actions
- Optimistic UI only where documented (not session complete)

### Motion / 3D

Motion: short feedback on set complete and rest timer. Progress charts respect `prefers-reduced-motion`. 3D: **deferred to F13**; V1 Client has no exercise-library media API. Progress exercise detail is a polished info layout (level 1).

### Accessibility

44–56px targets. High contrast on dark gym lighting. Reduced motion still shows rest remaining as text. Do not rely on hover.

---

## TRAINER

### Device

**Desktop-first**, fully usable on tablet. Phone: dashboard, pending check-ins, client peek — not the plan editor as the happy path.

### Goals

1. See assigned clients and who needs attention
2. Review check-ins and leave feedback
3. Build templates, training plans, nutrition plans
4. Use the exercise library and media
5. Inspect progress, sessions, measurements, photos (assigned clients only)

Trainer **cannot** create Client or Trainer users (Admin-only). Empty states must not offer Create Client.

### Navigation

**Desktop sidebar** (F03):

| Item | API groups |
| --- | --- |
| Dashboard | `GET /api/v1/trainers/me/dashboard`, `.../reports/clients` |
| Clients | `GET /api/v1/trainers/me/clients` |
| Check-ins | `GET /api/v1/clients/:clientId/check-ins` (SUBMITTED/REVIEWED; DRAFT rejected). Detail `GET .../:checkInId`. Review `POST/PATCH .../:checkInId/review`. Dashboard `pendingCheckIns` is SUBMITTED only. |
| Training | templates + `clients/:id/training-plans` |
| Nutrition | foods + `clients/:id/nutrition-plans` |
| Exercises | `/exercises`, media list; owning TRAINER upload/delete on `createdByUserId` match |
| Notifications | `/notifications` |
| Profile | `GET/PATCH /api/v1/trainers/me` |

Client workspace: persistent header (name, status, back to Clients) plus tabs (Overview / Training / Progress / Body / Nutrition / Check-ins) on `/trainer/clients/$clientId/**`. Switching Clients must not flash the previous Client's data — `clientId` is part of every query key.


### Density

High: tables, filters, charts, keyboard. Drawers for plan detail.

### Motion / 3D

Minimal motion. 3D only on exercise detail — not on the client table.

### Accessibility

Focus rings, skip links, table semantics, dialog focus trap. Do not autoplay 3D.

---

## ADMIN

### Device

**Desktop-first.** Operational, not cinematic.

### Goals

1. Create and disable Trainers and Clients
2. Assign / end Trainer ↔ Client relationships
3. Operational counts dashboard (not private fitness content)
4. Exercise catalog and food catalog
5. Assignment history

Admin dashboard is **counts only** — do not display another client’s measurements there.

### Navigation

Sidebar:

| Item | API |
| --- | --- |
| Dashboard | `GET /api/v1/admin/dashboard` |
| Trainers | `/trainers` |
| Clients | `/clients` |
| Assignments | `PUT/DELETE /clients/:id/trainer`, history |
| Exercises | `/exercises` + media |
| Foods | `/nutrition/foods` |
| Notifications | `/notifications` (own inbox; F12) |

### Density

Data-heavy tables. Almost no illustration.

### Motion / 3D

**Forbidden** as decoration. Exercise 3D may appear only if Admin opens exercise detail (same as Trainer). No Spline, no Rive in Admin chrome.

### Accessibility

Same as Trainer. Status (ACTIVE/DISABLED) via text + badge, not color alone.

---

## Shared rules

- Copy is motivating but not shaming.
- Spanish/English later; do not hard-code architecture to one language.
- Notifications are per authenticated user, never a global firehose.
- F10 Trainer check-in review must invalidate Trainer list/detail/dashboard pending keys. Client devices see the review on the next fetch (`staleTime` 60s). Do not call Trainer `/clients/:id/check-ins` from the Client app.
