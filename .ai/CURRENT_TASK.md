# Current Task

STATUS: READY
<!-- PLANNING -> (PLAN_FAILED) -> READY -> IMPLEMENTING -> REVIEW -> CHANGES_REQUESTED -> APPROVED -->

## Title

Subscriptions P1 — Free self-signup + Pro plan paid by SINPE Móvil (backend, migration, API contract)

## Context

- **Product decision (owner: Ronny, 2026-10-01):**
  - Anyone can create a **FREE** client account from the public site. A FREE account has no trainer.
  - The **PRO** plan includes a trainer. It is paid **manually by SINPE Móvil**: the client pays, then reports the payment in the app. An Admin checks it against the bank and approves it, which extends PRO by one period.
  - No card gateway yet. Design the data so a gateway (ONVO or Tilopay) can be added later as another `provider`.
- This is a **new product feature outside the F-roadmap**.
  - It touches files owned by line A (`clients`, `trainer-client-assignments`, auth/session) and shared migrations. Coordinate with Eli and ship it as its own PR (see `docs/TEAM-PLAN.md`).
- **P2 (next task, NOT this one):** the frontend.
  - `/register` page, the client "Mi plan" page with the SINPE instructions and the payment report form, the Admin "Pagos" review page, and the landing and login CTAs.
  - Updated public copy and chatbot knowledge, which today say "no sign-up / no payments".
  - P1 only regenerates the API client so the frontend compiles.

## Existing state (verified; do not re-audit)

- **Roles:** `ADMIN | TRAINER | CLIENT` (`users/enums`). Users and profiles are created only by Admin through `POST /clients`, using `ClientsService.create`. That method validates the password policy, hashes the password and inserts the user and the `client_profiles` row in one transaction, and returns 409 on a duplicate email.
- **Required profile fields:** `client_profiles` requires `primary_goal` and `experience_level`.
- **Login:** `AuthService.login(email, password)` returns an `AuthResult`. `AuthController` sets the refresh cookie and returns the access token. Throttling uses `@nestjs/throttler`, with per-route `@Throttle` constants in `auth.constants.ts`.
- **Module dependency:** `ClientsModule` already imports `AuthModule`. Do not make `AuthModule` import `ClientsModule`, because that would create a circular dependency.
- **Trainer assignments:**
  - The table is `trainer_client_assignments`, with at most one row where `ended_at IS NULL` per client.
  - Admin assigns with `PUT /clients/:clientId/trainer` and ends an assignment with `DELETE /clients/:clientId/trainer`.
  - All trainer access goes through `TrainerClientAccessService`.
- **No scheduler** (`@nestjs/schedule` is not installed), and none may be added.
- **Migrations:** the latest timestamp is `1758067200000`.

## Goal

A visitor can create a FREE client account and is logged in immediately. A client can see their plan and the SINPE instructions, and can report a SINPE payment. An Admin can approve or reject reported payments, which extends PRO. An Admin can also grant or revoke a complimentary PRO. A trainer can only be assigned to a client whose effective plan is PRO.

## Scope

### 1. DB (one new migration, reversible `down`, timestamp > `1758067200000`)

**Table `client_subscriptions`** (one row per client):
- `client_profile_id` (uuid): PK, FK → `client_profiles`, on delete cascade.
- `pro_until` (timestamptz, nullable): the end of the paid PRO time.
- `complimentary` (boolean, not null, default false): PRO granted by an Admin, with no expiry.
- `updated_by_user_id` (uuid, nullable): FK → `users`.
- `created_at`, `updated_at`.

**Table `subscription_payments`:**
- `id` (uuid).
- `client_profile_id`: FK, on delete cascade, indexed.
- `provider`: enum `subscription_payment_provider`, value `SINPE_MOVIL` only for now; not null.
- `status`: enum `PENDING | APPROVED | REJECTED`; not null, default `PENDING`.
- `amount_crc` (int, not null): a snapshot of the configured price at the moment the payment is reported.
- `reference` (varchar(40), not null): the SINPE receipt or reference number, trimmed.
- `payer_phone` (varchar(16), nullable).
- `paid_on` (date, not null).
- `period_start`, `period_end` (timestamptz, nullable): set on approval.
- `reviewed_by_user_id` (nullable FK → `users`), `reviewed_at` (nullable), `rejection_reason` (varchar(300), nullable).
- `created_at`, `updated_at`.

**Constraints:**
- partial unique index on `(provider, reference)` WHERE `status <> 'REJECTED'`, so the same receipt cannot be used twice;
- partial unique index on `(client_profile_id)` WHERE `status = 'PENDING'`, so a client has at most one pending payment;
- CHECK `amount_crc > 0`.

**Backfill:** insert one `client_subscriptions` row for every existing client. Set `complimentary = true` for clients that have an active trainer assignment (`ended_at IS NULL`), so current real clients do not lose their trainer. Everyone else is FREE.

### 2. Config (`config/env.validation.ts` + `backend/.env.example`)

| Variable | Type | Notes |
| --- | --- | --- |
| `SUBSCRIPTION_SINPE_PHONE` | optional string, 8 digits | |
| `SUBSCRIPTION_SINPE_HOLDER_NAME` | optional string | |
| `SUBSCRIPTION_PRO_PRICE_CRC` | optional int > 0 | |
| `SUBSCRIPTION_PRO_PERIOD_DAYS` | int | Default 30 |

- **Payments are "configured"** only when the phone, holder name and price are all set.
- **When they are not configured:**
  - the report endpoint returns 503 with a stable message;
  - the subscription response sets `sinpe: null`;
  - signup still works.
- **Defaults:** none for the phone and the price. No real numbers in the repo.

### 3. New module `backend/src/modules/subscriptions/`

Follow the existing module patterns: entities, DTOs with Swagger decorators, a mapper and constants.

**`SubscriptionsService` rules:**
- **Effective plan:** `PRO` if `complimentary` is true, or if `pro_until > now`. Otherwise `FREE`. Evaluate it at read time (no cron).
- **Approve:**
  - Run it in one transaction, with a row lock on the payment and on the subscription row.
  - The payment must still be `PENDING`, otherwise 409.
  - Compute `start = max(now, pro_until ?? now)` and `end = start + PERIOD_DAYS`.
  - Set `pro_until = end`. On the payment, set `period_start`/`period_end`, `status = APPROVED`, the reviewer and `reviewed_at`.
- **Reject:** the payment must be `PENDING`. Store the reason (required, 3–300 chars), the reviewer and `reviewed_at`.
- **Create a subscription row** (FREE) whenever a client profile is created, both by Admin and by self-signup, in the same transaction as the profile. Expose a helper that `ClientsService` can call with the transaction manager.

**Endpoints:**

| Method + path | Roles | Behaviour |
| --- | --- | --- |
| `GET /clients/me/subscription` | CLIENT | `{ plan: 'FREE'\|'PRO', source: 'PAID'\|'COMPLIMENTARY'\|null, proUntil, periodDays, sinpe: { phone, holderName, priceCrc } \| null, pendingPayment, lastRejectedPayment }` |
| `POST /clients/me/subscription/payments` | CLIENT | Body `{ reference, paidOn, payerPhone? }`. `amount_crc` comes from config and is never taken from the body. Returns 201 with the payment. 409 if a pending payment exists or the reference was already used. 503 if payments are not configured. Throttled. `paidOn` cannot be in the future or more than 30 days ago (400). |
| `GET /admin/subscription-payments?status=&page=&pageSize=` | ADMIN | Paginated, newest first. Each row includes the client's id, name and email, the amount, the reference, the phone, `paidOn`, the status and the review fields. Uses the same pagination shape as the clients list. |
| `POST /admin/subscription-payments/:id/approve` | ADMIN | Returns the updated payment and the client's new `proUntil`. |
| `POST /admin/subscription-payments/:id/reject` | ADMIN | Body `{ reason }`. |
| `GET /clients/:clientId/subscription` | ADMIN | The same shape as the client view, without `sinpe`. |
| `PATCH /clients/:clientId/subscription` | ADMIN | Body `{ complimentary: boolean }`. |
| `GET /admin/subscriptions/expired-with-trainer` | ADMIN | Clients whose effective plan is FREE but who still have an active assignment, so the Admin can end it manually. Paginated. |

**Payment responses** to non-Admins never include another client's data. A client only ever sees their own payments.

### 4. Public self-signup

- **`POST /auth/register`**: `@Public`, with its own `@Throttle` constants (a strict limit per IP).
  - Body: `email`, `password`, `firstName`, `lastName`, `primaryGoal`, `experienceLevel`, optional `goalNotes`, and `acceptTerms: true` (required literal true).
  - It always creates role `CLIENT` and status `ACTIVE`, plus the FREE subscription row. The role is never read from the body, and `forbidNonWhitelisted` rejects extra fields.
  - It reuses the `ClientsService.create` logic: extract a shared internal method instead of duplicating it. Then it logs in through `AuthService.login`, sets the refresh cookie the same way as `/auth/login`, and returns the same `AuthTokenResponseDto`.
  - Duplicate email gives 409, with the same message the Admin create uses.
- **Where it lives:** place the controller in a module that imports both `AuthModule` and `ClientsModule` (e.g. a small `registration` module, or inside `subscriptions`). Do not introduce a circular dependency. Reuse `AuthCookieService` for the cookie; do not copy the private controller helpers.

### 5. Trainer assignment gate (line A file — keep the change minimal)

- **Assignment gate:** `PUT /clients/:clientId/trainer` returns **409** with a stable message (e.g. `Client has no active Pro plan`) when the client's effective plan is FREE.
  - Reassigning an existing PRO client keeps working.
  - Ending (`DELETE`) is never blocked.
- **Trainer access when PRO expires:** there is no automatic unassignment. An expired PRO keeps the trainer's access until an Admin ends the assignment. The Admin finds these clients through the expired list above.

### 6. API client

- Run `npm run api:generate` in `frontend/`, with the backend running. Fix only what is needed for the frontend to compile. No UI work.

## Out of scope

- All UI (that is P2): register page, "Mi plan", Admin "Pagos", landing/login CTAs, public copy, and the chatbot knowledge in `chat-system-prompt.ts` / `public-assistant-knowledge.ts`.
- Card payments, gateways, webhooks, refunds and electronic invoices (factura electrónica).
- Email verification, welcome or payment emails, and in-app notifications for payments.
- A scheduler or cron, and automatic unassignment on expiry.
- Automatic trainer assignment, and letting the client pick a trainer.
- The nutritionist role.
- Self-made training plans for FREE clients (built from templates). That is a later task.
- Feature-gating any other existing client endpoint by plan.

## Security / authorization

- **Roles:** follow the endpoint table. A CLIENT can never approve, reject, grant complimentary PRO or read another client's subscription or payments (403 or 404, following the existing `me` patterns). A TRAINER gets 403 on every subscription endpoint.
- **Signup:**
  - throttled;
  - the role is server-forced;
  - the password policy is enforced;
  - no account enumeration beyond the existing 409 on duplicate email;
  - the access token stays in memory and the refresh token in the HttpOnly cookie, exactly like login.
- **Payments:**
  - the amount is server-side only;
  - approval is transactional and idempotent (approving twice gives 409, and `pro_until` is never extended twice);
  - the reference is unique among non-rejected payments.
- **Logs:** never log the password, tokens, cookies, `reference` or `payer_phone`.
- **Bank checks:** the app never checks the bank automatically. The Admin is the trust boundary. Note this in the Swagger description of the approve endpoint.

## Restrictions (Codex)

- Follow `AGENTS.md` and `.cursor/rules/backend-standards.mdc`.
- **DB changes only through one new TypeORM migration** (`synchronize: false`).
- **No new dependencies.**
- **Changes to existing endpoints are additive only.** The one exception is the new 409 on `PUT /clients/:clientId/trainer`.
- Never hand-edit `frontend/src/generated/**`.
- Do not run the full test/lint/build suites. You may run the unit specs you touch. General checks belong to `npm run ai:check:*`.
- No commits or pushes.

## Acceptance criteria

1. **Migration:** `up` → `down` → `up` runs cleanly on the local DB with seeded QA data.
   - After `up`, every client has exactly one `client_subscriptions` row.
   - Clients with an active assignment have `complimentary = true`. All other clients are FREE.
2. **Signup:** `POST /auth/register` creates a CLIENT, its profile and a FREE subscription, and returns an access token plus the refresh cookie. `GET /auth/me` then works.
   - Duplicate email gives 409.
   - Extra fields such as `role` give 400.
   - A weak password gives 400.
   - The throttle limit gives 429.
3. **Admin-created clients** (`POST /clients`) also get a FREE subscription row.
4. **Report payment:** reporting creates a PENDING payment with `amount_crc` taken from config.
   - A second report while one is pending gives 409.
   - A reused reference gives 409, unless the earlier payment was rejected.
   - A future or too-old `paidOn` gives 400.
   - Unconfigured payments give 503.
5. **Approve:**
   - FREE → PRO with `proUntil = now + periodDays`;
   - an active PRO is extended from the current `proUntil`, not from now;
   - approving twice gives 409.
6. **Reject:** stores the reason and does not change the plan. The client can then report again, even with the same reference.
7. **Complimentary** makes the plan PRO with `source: 'COMPLIMENTARY'` and no expiry. Revoking it falls back to the paid `pro_until`, or to FREE.
8. **Assignment gate:** assigning a trainer to a FREE client gives 409, and to a PRO client works. Ending an assignment always works.
9. **Expired list:** `expired-with-trainer` lists exactly the FREE clients that still have an active assignment.
10. **Authorization:** CLIENT and TRAINER get 403 on the Admin endpoints. A TRAINER gets 403 on the `me/subscription` endpoints.
11. **Frontend:** compiles against the regenerated client.

## Test plan (orchestrator, after implementation)

- **Loop:** `npm run ai:check:fast`, then `ai:review`, then `npm run ai:check:full`.
- **Unit tests:**
  - effective-plan calculation: complimentary, future/past/null `pro_until`;
  - the period extension maths;
  - the approve/reject state machine;
  - register DTO whitelisting.
- **E2E** (`backend/test/`): a new `subscriptions.e2e-spec.ts` and `registration.e2e-spec.ts` covering criteria 2–10. Extend the existing assignments E2E for the 409 gate. The seed or fixture clients that get assigned in existing E2E tests must be made PRO (complimentary) in their setup.
- **Migration:** `migration:run` → `migration:revert` → `migration:run` on Docker, then check the backfill counts with SQL.

## Implementation notes

- Suggested order:
  1. migration and entities;
  2. `SubscriptionsService` and its unit tests;
  3. hook the FREE row into `ClientsService.create`;
  4. client and Admin endpoints;
  5. register endpoint;
  6. assignment gate;
  7. E2E;
  8. `api:generate`.
- Name the 409 and 503 messages as constants in `subscriptions.constants.ts` so P2 can map them to Spanish copy.
