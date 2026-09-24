# Training Platform API

NestJS REST API foundation for the training, fitness tracking, and nutrition platform.

## Prerequisites

- Node.js 22+
- npm 11+
- PostgreSQL 16+ (local install or Docker)

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` for your local machine. Do not commit `.env`.

## Environment configuration

Required variables are listed in `.env.example`:

- `NODE_ENV` — `development` | `test` | `production`
- `PORT` — HTTP port
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_SSL`
- `CORS_ORIGIN` — comma-separated absolute origins (for example `http://localhost:5173`)
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_ACCESS_ISSUER`, `JWT_ACCESS_AUDIENCE`
- `AUTH_REFRESH_TTL_DAYS`, `AUTH_REFRESH_COOKIE_NAME`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`
- `OBJECT_STORAGE_DRIVER` — `s3` | `memory` (`memory` is rejected in production)
- `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` (required when driver is `s3`)
- `OBJECT_STORAGE_ENDPOINT` — optional custom endpoint (MinIO, R2)
- `OBJECT_STORAGE_FORCE_PATH_STYLE`
- `EXERCISE_MEDIA_UPLOAD_TTL_SECONDS`, `EXERCISE_MEDIA_READ_TTL_SECONDS`
- `EXERCISE_VIDEO_MAX_BYTES`, `EXERCISE_IMAGE_MAX_BYTES`
- `PROGRESS_PHOTO_MAX_BYTES` — progress-photo size cap (default 10 MiB)

Optional seed-only variables: `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_FIRST_NAME`, `INITIAL_ADMIN_LAST_NAME`.

The process fails at startup if required variables are missing or invalid. `CORS_ORIGIN=*` is rejected in production. Production also rejects placeholder JWT secrets and well-known default database passwords. Swagger is enabled in development/test and disabled by default in production (`SWAGGER_ENABLED=true` to enable). See [docs/security.md](docs/security.md) and [docs/production-runbook.md](docs/production-runbook.md).

## Start PostgreSQL

Docker Desktop is required for the Compose-based local database. Install it, then from `backend/`:

```bash
docker compose up -d
docker compose ps
npm run migration:show
```

This starts PostgreSQL 16 and a private MinIO instance. The Compose project name is `backend`, which matches the live local database container `backend-postgres-1` and volume `backend_training_postgres_data`. Do not delete that container or volume.

Postgres is published on `5432`, MinIO S3 on `9100`, and the MinIO console on `9101`. Do not run `docker compose --remove-orphans` or `docker compose down -v` against this stack.

A leftover unused container `training-app-postgres-1` may exist from an older Compose project name. See [docs/production-runbook.md](docs/production-runbook.md). Do not remove it automatically.

Application `DATABASE_*` values must match the Compose `POSTGRES_*` values documented in `.env.example`. For local S3-compatible media, set `OBJECT_STORAGE_DRIVER=s3`, point `OBJECT_STORAGE_ENDPOINT` at `http://localhost:9100`, set `OBJECT_STORAGE_FORCE_PATH_STYLE=true`, and use the same access key / secret as `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`. The init container creates a private bucket `training-exercise-media`.

If you already run PostgreSQL locally, point `.env` at that instance instead. Object storage is optional for identity APIs; E2E tests use `OBJECT_STORAGE_DRIVER=memory` and never target production buckets.

## Run the backend

```bash
npm run start:dev
```

Production-style start after a build:

```bash
npm run build
npm run start:prod
```

## Tests

```bash
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:minio
npm run build
```

`test:e2e` uses `OBJECT_STORAGE_DRIVER=memory`. `test:e2e:minio` is a dedicated live MinIO smoke for progress photos (`OBJECT_STORAGE_DRIVER=s3`, private bucket, path-style). It does not take Docker volumes down.

Health e2e tests require a reachable PostgreSQL instance. They are reported as pending when the database is unavailable.

## Migrations

TypeORM CLI commands (run from `backend/`):

```bash
npm run migration:create -- src/database/migrations/Name
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
npm run migration:show
```

`synchronize` is disabled. Production deployments run migrations as an explicit job (`npm run migration:run` or `npm run migration:run:prod` against compiled `dist`), then start the API. The application does not auto-migrate on boot.

Create the first local administrator once (does not run on API startup):

```bash
npm run seed:admin
```

Provide `INITIAL_ADMIN_*` in `.env` first. The command is idempotent and will not reset an existing password.

Login is limited to 8 requests per minute and refresh to 12 requests per minute (in addition to the global 120 requests per 60 seconds). Direct upload-request endpoints are limited to 20 per minute. Those route limits stay enabled in every environment, including tests. The functional authentication E2E suite sets `AUTH_E2E_SKIP_THROTTLE=true` so volume does not flake; a dedicated throttling E2E suite asserts HTTP 429.

## Domain identity

User is authentication identity only. Do not implement generic role mutation that can leave orphan or inconsistent domain records.

A valid trainer is created atomically as:

`User(role=TRAINER)` + `TrainerProfile`

Both rows are written in one database transaction. If profile persistence fails, the `User(role=TRAINER)` insert is rolled back so no orphan identity remains. The service always forces `role=TRAINER` and `status=ACTIVE` on create; clients cannot send `role`, `status`, or `passwordHash`.

Trainer status is `User.status` (`ACTIVE` | `DISABLED`). There is no separate status column on `TrainerProfile`.

### TrainerProfile persistence

`trainer_profiles.user_id` references `users.id` with `ON DELETE CASCADE` and a unique constraint. A profile cannot exist without its user. Deleting a user (including authentication e2e cleanup) therefore removes the profile automatically.

Indexes are limited to that unique `user_id`. `users.email` is already unique, and list filters on `firstName` / `lastName` do not have extra indexes yet — adding them now would be premature.

### Access tokens after disable

`AccessAuthGuard` does not trust the JWT payload alone. It calls `AuthService.requireActiveSession`, which loads the refresh session and `UsersService.findActiveById`. A disabled user or a revoked session is rejected on the next protected request even if the access token signature is still valid. Re-enabling a trainer does not restore revoked sessions; the trainer must log in again.

### Password provisioning

An administrator sets the trainer's initial password at create time. The password is validated against the existing policy (minimum 12 characters), hashed with Argon2id **before** the create transaction, and is never returned or logged. This provisioning path is temporary until invitation / setup-token flows exist.

Do not mutate a user's role through generic user CRUD.

A valid client is created atomically as:

`User(role=CLIENT)` + `ClientProfile`

Both rows are written in one database transaction. If profile persistence fails, the `User(role=CLIENT)` insert is rolled back. The service always forces `role=CLIENT` and `status=ACTIVE` on create; clients cannot send `role`, `status`, `passwordHash`, or `trainerId`.

Client status is `User.status`. There is no status column on `ClientProfile`.

`ClientProfile` does **not** store `trainerId`. The current trainer is the unique active row in `trainer_client_assignments` (`ended_at IS NULL`). A trainer may have many current clients. Assignment history is retained when a relationship ends or changes. TRAINER users see only their actively assigned clients via `/trainers/me/clients`. Changing assignment does not revoke login sessions.

Disabling a trainer or client does not end assignments. Disabled users cannot authenticate. New assignments to a disabled trainer or client are rejected. After re-enable, the stored assignment still applies until an ADMIN changes it.

### Trainer ↔ Client assignment

`trainer_client_assignments` uses `ON DELETE RESTRICT` toward trainer/client profiles and actor users so history is not silently deleted. PostgreSQL enforces one current trainer per client with a partial unique index on `client_profile_id WHERE ended_at IS NULL`. Active-trainer listing uses a partial index on `trainer_profile_id WHERE ended_at IS NULL`. Assignment writes lock the client profile row inside a transaction, then lock the active assignment row when one exists. Concurrent first-assigns serialize on the client row; the unique index remains the last line of defense if two active rows are attempted. Historical rows do not grant trainer access. Assignment changes do not revoke login sessions.

| Method | Path | Roles |
| --- | --- | --- |
| PUT | `/api/v1/clients/:clientId/trainer` | ADMIN |
| DELETE | `/api/v1/clients/:clientId/trainer` | ADMIN |
| GET | `/api/v1/clients/:clientId/trainer` | ADMIN |
| GET | `/api/v1/clients/:clientId/trainer-history` | ADMIN |
| GET | `/api/v1/clients/me/trainer` | CLIENT |
| GET | `/api/v1/trainers/me/clients` | TRAINER |
| GET | `/api/v1/trainers/me/clients/:clientId` | TRAINER |

There is no trainer-wide `GET /clients` access. ADMIN keeps `/clients`.

### Exercise catalog

`Exercise` is a reusable catalog definition (for example Barbell Bench Press). It does **not** store prescription or performance values such as sets, reps, weight, rest, RPE, or RIR. Prescription belongs to `WorkoutTemplateExercise`. Client-specific load and scheduling belong to `TrainingPlanExercise`. Actual performance belongs to a future `WorkoutSession`. Demonstration videos and instruction images live in `ExerciseMedia`, not on `Exercise`, templates, or plans.

Lifecycle is `ACTIVE` | `ARCHIVED`. There is no `DELETE /exercises/:id`. Archived rows stay for future history. List defaults to `ACTIVE` unless `status` is passed explicitly.

Creator is `created_by_user_id` with `ON DELETE RESTRICT`. ADMIN and TRAINER share read access to the catalog. TRAINER may create exercises and may update/archive only their own. ADMIN may mutate any exercise. CLIENT has no catalog API in this version.

Disabling a trainer does not archive their exercises. Remaining ACTIVE catalog items stay visible to other trainers and admins.

Same creator cannot persist two exercises whose names collide after trim, collapsed whitespace, and case-insensitive comparison. Display casing is kept. Different creators may use the same name.

Indexes: `created_by_user_id` (FK / ownership), `status` (default list). Muscle/equipment enums are not indexed at current scale. `ILIKE '%search%'` is not backed by `pg_trgm`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/exercises` | ADMIN, TRAINER |
| GET | `/api/v1/exercises` | ADMIN, TRAINER |
| GET | `/api/v1/exercises/:id` | ADMIN, TRAINER |
| PATCH | `/api/v1/exercises/:id` | ADMIN, TRAINER (own) |
| PATCH | `/api/v1/exercises/:id/status` | ADMIN, TRAINER (own) |

### Workout templates

A `WorkoutTemplate` is a reusable prescription for **one** workout (Push Day, Leg Day). It is not a client plan and not a performed session.

Domain split:

| Concept | Responsibility |
| --- | --- |
| `Exercise` | What the movement is. |
| `WorkoutTemplate` / `WorkoutTemplateExercise` | Reusable ordered prescription (sets, reps or duration, rest, optional RPE **or** RIR, tempo, notes). |
| `TrainingPlan` / `TrainingPlanWorkout` / `TrainingPlanExercise` | Client-owned snapshot and personalization. Copied from a usable template at write time. |
| `WorkoutSession` / `WorkoutSessionExercise` / `WorkoutSet` | Execution snapshot at session start plus actual performed sets. |

Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED`. New templates start `DRAFT`. There is no `DELETE /workout-templates/:id`. `ARCHIVED` rows are read-only until reactivated. Activation and reactivation require at least one item, currently `ACTIVE` exercises, and valid prescriptions. Empty items are allowed only while `DRAFT`.

Visibility:

| Status | ADMIN | Creator TRAINER | Other TRAINER | CLIENT |
| --- | --- | --- | --- | --- |
| ACTIVE | read + mutate | read + mutate | read only (mutate → 404) | 403 |
| DRAFT | read + mutate | read + mutate | 404 | 403 |
| ARCHIVED | read; reactivate | read; reactivate | 404 | 403 |

Default list is `ACTIVE` (shared catalog). TRAINER `status=DRAFT` or `status=ARCHIVED` is scoped to the creator in SQL. Names are not globally unique.

`created_by_user_id` uses `ON DELETE RESTRICT`. Template items use `ON DELETE CASCADE` from the template (items are meaningless without it; there is no template delete API) and `ON DELETE RESTRICT` toward `exercises` so catalog history cannot disappear silently.

Archiving an `Exercise` does **not** remove it from templates or archive the template. The template may remain `ACTIVE`, but `WorkoutTemplatesService.requireUsableTemplate` / `requireUsableTemplateWithItems` reject it for future Training Plan creation.

Do not put `clientId`, target weight, actual performance, or Exercise media copies on templates.

Indexes: `created_by_user_id`, `status`, `workout_template_exercises.workout_template_id`. Unique `(workout_template_id, position)` already supports lookups by `workout_template_id` (leftmost column); the extra standalone index is redundant but harmless and is left in place to avoid a schema-only migration.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/workout-templates` | ADMIN, TRAINER |
| GET | `/api/v1/workout-templates` | ADMIN, TRAINER |
| GET | `/api/v1/workout-templates/:id` | ADMIN, TRAINER (shared ACTIVE; own DRAFT/ARCHIVED) |
| PATCH | `/api/v1/workout-templates/:id` | ADMIN, TRAINER (own, non-archived) |
| PUT | `/api/v1/workout-templates/:id/exercises` | ADMIN, TRAINER (own, non-archived) |
| PATCH | `/api/v1/workout-templates/:id/status` | ADMIN, TRAINER (own) |

### Training plans

A `TrainingPlan` belongs to one `ClientProfile`. It is a **snapshot** of reusable Workout Templates plus plan-owned personalization. Reads never join live `WorkoutTemplateExercise` rows.

Authorization follows the **current** active trainer-client assignment, not `createdByUserId`. That field is provenance only. After Client X moves from Trainer A to Trainer B, A loses plan access immediately and B gains it. No plan copy and no session revocation. There is no `trainerId` on the plan.

Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED`. New plans start `DRAFT`. PostgreSQL enforces at most one `ACTIVE` plan per client (`UNIQUE(client_profile_id) WHERE status = 'ACTIVE'`). Activating Plan B archives Plan A in the same transaction after locking the client profile. Dates (`startDate` / `endDate`) are optional `DATE` values and do not auto-activate. Disabled clients keep historical plans; ADMIN/assigned TRAINER may inspect them; mutations (create, edit, snapshot, activate) are rejected.

CLIENT is read-only. `GET /clients/me/training-plans` returns ACTIVE and ARCHIVED only. DRAFT is 404 on direct get and omitted from lists. `GET .../current` returns `{ trainingPlan: null }` when none is ACTIVE.

`PUT .../workouts` rebuilds structure from currently usable templates (ACTIVE template, ACTIVE exercises). Later template edits, template archive, or Exercise rename do not rewrite existing plan snapshots (`exerciseNameSnapshot` plus copied prescription). Canonical `exerciseId` remains for provenance and future media. `PATCH .../workouts/:id` changes `scheduledDay` / notes without resnapshotting. `PATCH .../exercises/:id` personalizes sets/reps/load (`targetLoadKg` kilograms, including 0). `CLIENT` still has no Exercise Library access; plan `exerciseId` values do not open `GET /exercises`.

Source template FK is `ON DELETE RESTRICT` (templates have no delete API; provenance must remain). Plan → workouts and workout → exercises use `ON DELETE CASCADE`. Client and creator FKs are `RESTRICT`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/:clientId/training-plans` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/:clientId/training-plans` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/:clientId/training-plans/:planId` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/training-plans/:planId` | ADMIN, assigned TRAINER |
| PUT | `/api/v1/clients/:clientId/training-plans/:planId/workouts` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/training-plans/:planId/workouts/:planWorkoutId` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/training-plans/:planId/exercises/:planExerciseId` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/training-plans/:planId/status` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/me/training-plans` | CLIENT |
| GET | `/api/v1/clients/me/training-plans/current` | CLIENT |
| GET | `/api/v1/clients/me/training-plans/:planId` | CLIENT |

### Workout sessions

A `WorkoutSession` is what a Client actually performed. At start, the backend copies the current ACTIVE `TrainingPlanWorkout` and its `TrainingPlanExercise` rows into session-owned snapshots. Later plan edits, `PUT /workouts` child-row replacement, plan archive, and Exercise rename do **not** rewrite an already-started session.

`sourceTrainingPlanWorkoutId` and `sourceTrainingPlanExerciseId` are UUID provenance only. They are **not** foreign keys. Task 09 may physically replace plan child rows; historical sessions must remain readable. `trainingPlanId` is a stable FK (`ON DELETE RESTRICT`). Canonical `exerciseId` is retained for provenance and future media. Display names use snapshots, never live `Exercise.name`.

Prescription lives on `WorkoutSessionExercise` (`prescribed*` fields). Actual performance lives on `WorkoutSet`. They are never mixed.

Lifecycle: `IN_PROGRESS` → `COMPLETED` or `CANCELLED`. Terminal states are immutable. PostgreSQL enforces at most one `IN_PROGRESS` session per client (`UNIQUE(client_profile_id) WHERE status = 'IN_PROGRESS'`). Repeated identical COMPLETED/CANCELLED requests are idempotent and do not change timestamps. Completing with zero recorded sets is `409`; cancel with zero sets is allowed.

Only **CLIENT** starts, records sets, completes, or cancels. Identity comes from `@CurrentUser()`. ADMIN and the current assigned TRAINER have **read-only** history. Trainer access follows the current assignment, not `TrainingPlan.createdByUserId`. There is no `trainerId` on the session.

New sessions may start only from the current ACTIVE plan. An already-started session remains completable if that plan is later archived or replaced. `GET .../current` returns `{ workoutSession: null }` when none is in progress.

Session-level notes are stored as a nullable column but have no update API in this task.

`dateFrom` / `dateTo` are inclusive UTC calendar days (`YYYY-MM-DD`) filtered on `startedAt`.

Static `/clients/me/workout-sessions` is registered before `/clients/:clientId/workout-sessions` so `me` is not captured as `:clientId`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/me/workout-sessions` | CLIENT |
| GET | `/api/v1/clients/me/workout-sessions` | CLIENT |
| GET | `/api/v1/clients/me/workout-sessions/current` | CLIENT |
| GET | `/api/v1/clients/me/workout-sessions/:sessionId` | CLIENT |
| PUT | `/api/v1/clients/me/workout-sessions/:sessionId/exercises/:sessionExerciseId/sets` | CLIENT |
| PATCH | `/api/v1/clients/me/workout-sessions/:sessionId/status` | CLIENT |
| GET | `/api/v1/clients/:clientId/workout-sessions` | ADMIN, assigned TRAINER (read-only) |
| GET | `/api/v1/clients/:clientId/workout-sessions/:sessionId` | ADMIN, assigned TRAINER (read-only) |

### Progress and performance

Progress is a **derived read model**. It does not persist `exercise_progress`, personal records, or cached statistics.

Source of truth:

1. `WorkoutSet` actual execution values.
2. Only `WorkoutSession.status = COMPLETED` sessions are eligible.
3. `ProgressModule` aggregates those rows at request time in PostgreSQL.

`IN_PROGRESS` and `CANCELLED` sessions are excluded even when they contain sets. Prescribed fields (`prescribedSets`, `prescribedReps*`, `prescribedTargetLoadKg`, and similar) are never treated as performed data. Training plan status and workout templates are not analytics filters: a completed session from an archived plan still counts.

Aggregation is by canonical `exerciseId` (plus `prescriptionType` when the same Exercise was executed as both `REPS` and `DURATION`). Display names on list/detail headers use the current `Exercise.name`. History rows keep `exerciseNameSnapshot`. Archived exercises remain visible (`exerciseStatus = ARCHIVED`).

Date filters `dateFrom` / `dateTo` are inclusive UTC calendar days (`YYYY-MM-DD`) on `WorkoutSession.startedAt`, matching Workout Session history. `dateTo < dateFrom` returns 400.

**External load volume** is `SUM(actualLoadKg * actualReps)` only when both values are NOT NULL. Null load does not assume bodyweight. Zero load contributes `0`. This is external load, not total biomechanical volume.

**Estimated 1RM** uses Epley only:

`estimated1RmKg = actualLoadKg × (1 + actualReps / 30)`

Eligible sets: `actualLoadKg > 0` and `1 <= actualReps <= 10`. Rounded to 2 decimal places. This is **not** an actual tested 1RM and is not stored. Sets such as `60 kg × 15` are excluded.

Personal bests choose the earliest achievement on ties (`metric DESC`, `startedAt ASC`, `setNumber ASC`). History is paginated by completed session, not by individual sets. Same Exercise twice in one session counts as one `completedSessions` value (`COUNT(DISTINCT workout_session_id)`); both occurrences' sets are kept.

There are no Progress write endpoints, Redis, queues, or materialized views.

Index added for this read path: `IDX_workout_session_exercises_exercise_id` on `(exercise_id, workout_session_id)`.

Static `/clients/me/progress` is registered before `/clients/:clientId/progress`.

| Method | Path | Roles |
| --- | --- | --- |
| GET | `/api/v1/clients/me/progress/summary` | CLIENT |
| GET | `/api/v1/clients/me/progress/exercises` | CLIENT |
| GET | `/api/v1/clients/me/progress/exercises/:exerciseId` | CLIENT |
| GET | `/api/v1/clients/:clientId/progress/summary` | ADMIN, assigned TRAINER (read-only) |
| GET | `/api/v1/clients/:clientId/progress/exercises` | ADMIN, assigned TRAINER (read-only) |
| GET | `/api/v1/clients/:clientId/progress/exercises/:exerciseId` | ADMIN, assigned TRAINER (read-only) |

### Body measurements and bodyweight history

Body progress is **Client-entered personal data**, not derived from workout execution. It is independent of Training Plans, Workout Sessions, and `ProgressModule`.

Source of truth:

- `BodyMeasurement` rows owned by `ClientProfile`
- `bodyWeightKg` on those rows is the only bodyweight history. There is no `BodyWeightHistory` table.

Canonical persistence units:

- weight: kilograms (`numeric(6,2)`)
- circumferences: centimeters (`numeric(6,2)`)
- body fat: percentage (`numeric(5,2)`)

The API does not store pounds or inches. Frontends may convert for display. Bounds (`> 0` and `<= 500` for kg/cm, `> 0` and `<= 100` for body fat) are technical input validation, not medical claims. A row must contain at least one metric; notes alone are rejected. Multiple measurements on the same calendar day are allowed. `measuredAt` is `timestamptz` UTC. Omitted values default to server now. Historical backdating is allowed. Values more than 5 minutes in the future are rejected.

CLIENT owns create, list, detail, and PATCH. There is **no measurement DELETE in v1**: history is progress data, corrections use PATCH, and account-level erasure belongs to a later privacy feature. TRAINER and ADMIN are read-only. Visibility for trainers follows the **current** `TrainerClientAssignment`. Reassignment does not rewrite historical rows; the previous trainer loses access (404) and the new trainer gains it.

List pagination: `page=1`, `limit=20`, `max=100`, default `measuredAt DESC`. `dateFrom` / `dateTo` are inclusive UTC calendar days (`YYYY-MM-DD`) on `measuredAt`. `hasBodyWeight=true` returns only rows with `bodyWeightKg` for charts.

`client_profile_id` uses `ON DELETE RESTRICT`. Index: `IDX_body_measurements_client_measured_at` on `(client_profile_id, measured_at DESC)`.

Static `/clients/me/body-measurements` is registered before `/clients/:clientId/body-measurements`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/me/body-measurements` | CLIENT |
| GET | `/api/v1/clients/me/body-measurements` | CLIENT |
| GET | `/api/v1/clients/me/body-measurements/:measurementId` | CLIENT |
| PATCH | `/api/v1/clients/me/body-measurements/:measurementId` | CLIENT |
| GET | `/api/v1/clients/:clientId/body-measurements` | ADMIN, assigned TRAINER (read-only) |
| GET | `/api/v1/clients/:clientId/body-measurements/:measurementId` | ADMIN, assigned TRAINER (read-only) |

### Progress photos

Progress photos are private body-progress images. PostgreSQL stores metadata only. Image bytes live in the existing private S3-compatible bucket under a separate key namespace:

`progress-photos/{clientProfileId}/{photoId}/{uuid}.{ext}`

Task 12 does **not** rename or migrate the MinIO/S3 bucket used by Exercise Media. Reusing the private bucket with a distinct prefix is the low-risk choice that preserves Task 07 behavior. Keys never include email, client name, or the original filename.

CLIENT creates upload requests, finalizes, lists, reads, and deletes. TRAINER and ADMIN are read-only on READY photos for currently assigned (or any, for ADMIN) clients. There is no management DELETE. Pose is supplied by the Client (`FRONT`, `SIDE`, `BACK`, `OTHER`). There is no AI, EXIF parsing, or image analysis.

Flow matches Exercise Media:

1. CLIENT `POST /api/v1/clients/me/progress-photos/upload-requests`
2. Direct browser signed POST to object storage (NestJS does not buffer the image)
3. CLIENT `POST .../finalize` — NestJS HEADs the object
4. READY photos get short-lived signed GET via `/access`

Allowlisted MIME types: `image/jpeg`, `image/png`, `image/webp`. Default size cap: `PROGRESS_PHOTO_MAX_BYTES` (10 MiB). Upload/read TTLs reuse `EXERCISE_MEDIA_UPLOAD_TTL_SECONDS` and `EXERCISE_MEDIA_READ_TTL_SECONDS`. Optional `bodyMeasurementId` must belong to the same Client (`ON DELETE SET NULL` so a future measurement delete does not destroy photo provenance).

Owner lists default to READY. CLIENT may pass `status=PENDING_UPLOAD` or `FAILED`. Management lists READY only. `originalFileName` is stored as untrusted metadata and is omitted from API responses.

HEAD metadata does **not** prove file contents. There is no malware scan or magic-byte verification. Object delete then row delete is **not** atomic; orphan objects or leftover rows are a residual risk for a future cleanup job. Stale `PENDING_UPLOAD` rows are not cleaned yet; `IDX_progress_photos_pending_created_at` supports that later. No Redis/BullMQ.

Unsigned object URLs must fail. Responses never include `storageKey`, bucket internals, credentials, or signed URLs except on dedicated access endpoints.

Static `/clients/me/progress-photos` is registered before `/clients/:clientId/progress-photos`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/me/progress-photos/upload-requests` | CLIENT |
| GET | `/api/v1/clients/me/progress-photos` | CLIENT |
| GET | `/api/v1/clients/me/progress-photos/:photoId` | CLIENT |
| GET | `/api/v1/clients/me/progress-photos/:photoId/access` | CLIENT (READY) |
| POST | `/api/v1/clients/me/progress-photos/:photoId/finalize` | CLIENT |
| DELETE | `/api/v1/clients/me/progress-photos/:photoId` | CLIENT |
| GET | `/api/v1/clients/:clientId/progress-photos` | ADMIN, assigned TRAINER (READY, read-only) |
| GET | `/api/v1/clients/:clientId/progress-photos/:photoId/access` | ADMIN, assigned TRAINER (READY, read-only) |

### Nutrition foods (Food Library)

A `NutritionFood` is a reusable catalog definition. Canonical nutrition is **per 100 grams**. The API does not persist cups, tablespoons, slices, or ounces as the nutritional source of truth. Calories are not required to equal `4P + 4C + 9F`; label rounding is stored as submitted.

Creators are ADMIN and TRAINER. `createdByUserId` comes from `@CurrentUser()`. CLIENT has no catalog routes (403). Names are not globally unique.

| Status | ADMIN | Creator TRAINER | Other TRAINER | CLIENT |
| --- | --- | --- | --- | --- |
| ACTIVE | read + mutate | read + mutate | read; mutate → 404 | 403 |
| ARCHIVED | read + mutate | read + mutate/reactivate | 404 | 403 |

Default list is ACTIVE (shared). TRAINER `status=ARCHIVED` is scoped to the creator. There is no DELETE. Archiving a food does **not** rewrite existing `NutritionPlanMealItem` snapshots. New snapshots and DRAFT/ARCHIVED plan activation require currently ACTIVE foods (`NutritionFoodsService.requireActiveFood` / `requireActiveFoodsByIds`, same `EntityManager` as plan writes).

`created_by_user_id` uses `ON DELETE RESTRICT`. Indexes: `status`, `created_by_user_id`.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/nutrition/foods` | ADMIN, TRAINER |
| GET | `/api/v1/nutrition/foods` | ADMIN, TRAINER |
| GET | `/api/v1/nutrition/foods/:foodId` | ADMIN, TRAINER (shared ACTIVE; own ARCHIVED) |
| PATCH | `/api/v1/nutrition/foods/:foodId` | ADMIN, TRAINER (own) |
| PATCH | `/api/v1/nutrition/foods/:foodId/status` | ADMIN, TRAINER (own) |

### Nutrition plans

A `NutritionPlan` is a **client-specific prescribed nutrition snapshot**. It is not actual intake. Future consumption logging (`NutritionLog` / calorie diary) is a separate client-owned execution domain and is **not implemented**.

Authorization follows the **current** active trainer-client assignment, not `createdByUserId`. That field is provenance only. After Client X moves from Trainer A to Trainer B, A loses plan access immediately and B gains it. No plan copy and no session revocation. There is no `trainerId` on the plan.

Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED`. New plans start `DRAFT`. PostgreSQL enforces at most one `ACTIVE` nutrition plan per client (`UNIQUE(client_profile_id) WHERE status = 'ACTIVE'`). Activating Plan B archives Plan A in the same transaction after locking the client profile. Dates (`startDate` / `endDate`) are optional `DATE` values and do not auto-activate. Disabled clients keep historical plans; ADMIN/assigned TRAINER may inspect them; mutations are 409.

CLIENT is read-only. `GET /clients/me/nutrition-plans` returns ACTIVE and ARCHIVED only. DRAFT is 404 on direct get and omitted from lists. `GET .../current` returns `{ nutritionPlan: null }` when none is ACTIVE. Static `/clients/me/nutrition-plans` is registered before `/clients/:clientId/nutrition-plans`.

Prescribed daily targets (`targetCaloriesKcal`, macros) are optional and independent of derived meal totals. Responses return both. Differences are `meal total − target` when a target exists; they are not persisted and are not labeled healthy/unhealthy.

`PUT .../meals` atomically replaces meals. Position is `arrayIndex + 1`. Each meal must have at least one item. Empty meal arrays are allowed only while DRAFT. Only ACTIVE Foods may be snapshotted. Copied fields: name, brand, per-100g calories/protein/carbs/fat/fiber. Later catalog rename, nutrient change, or archive does **not** mutate existing plans. `sourceFoodId` remains for provenance (`ON DELETE RESTRICT`). Render and totals use snapshot columns × `quantityGrams / 100`, rounded to 2 decimal places. `PATCH .../items/:mealItemId` may change `quantityGrams` and notes only.

DRAFT → ACTIVE and ARCHIVED → ACTIVE require currently ACTIVE source Foods. An already-ACTIVE plan stays ACTIVE if a catalog Food later archives. Reactivating an ARCHIVED plan whose source Food is archived is 409 and does not archive another ACTIVE plan.

Plan → meals and meal → items use `ON DELETE CASCADE`. Client, creator, and source food FKs are `RESTRICT`.

This module does not generate medical or AI nutrition advice. Grams are the canonical portion unit.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/:clientId/nutrition-plans` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/:clientId/nutrition-plans` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/:clientId/nutrition-plans/:planId` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/nutrition-plans/:planId` | ADMIN, assigned TRAINER |
| PUT | `/api/v1/clients/:clientId/nutrition-plans/:planId/meals` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/nutrition-plans/:planId/items/:mealItemId` | ADMIN, assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/nutrition-plans/:planId/status` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/me/nutrition-plans` | CLIENT |
| GET | `/api/v1/clients/me/nutrition-plans/current` | CLIENT |
| GET | `/api/v1/clients/me/nutrition-plans/:planId` | CLIENT |

### Check-ins

A `CheckIn` is a **Client self-report for a defined period**. It is not a copy of training, nutrition, bodyweight, or progress data. Future dashboards may correlate CheckIn periods with those domains. Recurring generation, chat, and AI interpretation are **not implemented**. Check-In submission and first review emit in-app notifications (see Notifications).

A `CheckInReview` is **Trainer feedback** on a submitted CheckIn. Client responses and Trainer review are separate records.

Lifecycle: `DRAFT` → `SUBMITTED` → `REVIEWED`. New CheckIns start `DRAFT`. There is no backward transition. Client responses become immutable after `SUBMITTED`. `DRAFT` content is private to the Client. ADMIN and the current assigned TRAINER cannot read DRAFT through management endpoints (detail is 404; lists never include DRAFT). Management `status=DRAFT` is rejected with 400 because DRAFT is not a management-visible status.

There is no `trainerId` on CheckIn. Visibility follows the **current** active trainer-client assignment via `TrainerClientAccessService`. After Client X moves from Trainer A to Trainer B, A loses CheckIn access immediately and B gains it. No session revocation. `reviewedByUserId` is provenance only and does not grant later access. If A already reviewed, B can read A's historical review but cannot overwrite it (409). If the CheckIn was submitted and not yet reviewed, B may create the review.

ADMIN is read-only for SUBMITTED/REVIEWED CheckIns and reviews. ADMIN cannot create, edit, submit, or delete Client CheckIns, and cannot create or edit Trainer reviews.

Exact duplicate periods are rejected (`UNIQUE(client_profile_id, period_start, period_end)`). Overlapping but non-identical periods are allowed in v1. Maximum period length is 31 days (`periodEnd − periodStart ≤ 31`). Date filters `dateFrom`/`dateTo` apply inclusively to `periodStart`.

Self-reported 1–5 ratings are subjective (lower self-rating to higher self-rating), not medical. Adherence percentages are Client-reported, not derived from WorkoutSessions or NutritionPlans. Submitting or reviewing a CheckIn does not mutate Training Plans, Nutrition Plans, measurements, progress photos, or assignments.

`ON DELETE CASCADE` from CheckIn to CheckInReview is safe: only DRAFT CheckIns may be deleted, and DRAFT CheckIns cannot have a review. Submitted/reviewed CheckIns cannot be deleted through the API.

Static `/clients/me/check-ins` is registered before `/clients/:clientId/check-ins`. CLIENT `GET /clients/me/check-ins` is 200. ADMIN/TRAINER hitting that static `/me` route receive 403, not a UUID parse 400.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients/me/check-ins` | CLIENT |
| GET | `/api/v1/clients/me/check-ins` | CLIENT |
| GET | `/api/v1/clients/me/check-ins/:checkInId` | CLIENT |
| PATCH | `/api/v1/clients/me/check-ins/:checkInId` | CLIENT |
| PATCH | `/api/v1/clients/me/check-ins/:checkInId/status` | CLIENT |
| DELETE | `/api/v1/clients/me/check-ins/:checkInId` | CLIENT |
| GET | `/api/v1/clients/:clientId/check-ins` | ADMIN, assigned TRAINER |
| GET | `/api/v1/clients/:clientId/check-ins/:checkInId` | ADMIN, assigned TRAINER |
| POST | `/api/v1/clients/:clientId/check-ins/:checkInId/review` | assigned TRAINER |
| PATCH | `/api/v1/clients/:clientId/check-ins/:checkInId/review` | assigned TRAINER (original reviewer) |

### Notifications and Activity Events

Business actions persist an immutable `ActivityEvent` and, when a recipient exists, a private `Notification` inbox row **in the same PostgreSQL transaction**. This is not an in-memory `EventEmitter` pipeline: if the process dies, committed events remain in PostgreSQL. There is no Redis, worker, email, SMS, or push delivery in v1.

```
Business action
  → ActivityEvent (durable ledger)
  → Notification (recipient inbox state)
  → GET /api/v1/notifications
```

`activity_events` is a durable event ledger. It is **not** a complete transactional outbox: there is no delivery cursor, processor, or `processed_at`. A later Task may add:

```
ActivityEvent → Outbox / Delivery Worker → Email / Push / other channels
```

Supported types:

| Event | Actor | Recipient | Related entity |
| --- | --- | --- | --- |
| `CHECK_IN_SUBMITTED` | Client User | Current assigned Trainer User | CheckIn |
| `CHECK_IN_REVIEWED` | Trainer User | Client User | CheckIn |
| `TRAINING_PLAN_ACTIVATED` | Trainer or ADMIN | Client User | TrainingPlan |
| `NUTRITION_PLAN_ACTIVATED` | Trainer or ADMIN | Client User | NutritionPlan |

Recipient for Check-In submission is resolved from the **current** `TrainerClientAssignment` at submit time, not from CheckIn history. If the Client is unassigned, submission still succeeds, the ActivityEvent is stored, and **no Notification** is created. Later assignment does **not** backfill that notification. Review `PATCH` and already-ACTIVE plan calls do not emit again. Genuine later reactivation of an archived plan does emit a new activation event. Auto-archiving the previous ACTIVE plan when a replacement is activated does not emit its own notification.

Events store IDs and type only. They never copy Check-In ratings/text, Trainer feedback, nutrition macros, or training prescriptions. Notification API responses are semantic (`type`, `relatedEntity`, `clientProfileId`, `readAt`) so the frontend can localize copy.

The inbox is strictly `recipientUserId = currentUser.id`. ADMIN cannot list or mark another user's notifications. There is no `POST /notifications`, no public ActivityEvent API, no mark-unread, and no notification delete in v1. Read is one-way and idempotent (`readAt` is not rewritten). Disabled users may still receive rows; they cannot authenticate until re-enabled.

Static routes `/notifications/unread-count` and `/notifications/read-all` are registered before `/:notificationId/read`.

| Method | Path | Roles |
| --- | --- | --- |
| GET | `/api/v1/notifications` | ADMIN, TRAINER, CLIENT (own inbox) |
| GET | `/api/v1/notifications/unread-count` | ADMIN, TRAINER, CLIENT (own count) |
| PATCH | `/api/v1/notifications/read-all` | ADMIN, TRAINER, CLIENT (own unread) |
| PATCH | `/api/v1/notifications/:notificationId/read` | ADMIN, TRAINER, CLIENT (own row) |

### Dashboards and reports

Dashboards are **read-only compositions** of existing domains. They are not a source of truth. Request-time PostgreSQL aggregation reads Training Plans, Nutrition Plans, Workout Sessions, Workout Sets, Body Measurements, Progress Photos (counts only), Check-Ins, TrainerClientAssignments, and Notifications. There are **no dashboard tables**, no Redis, no cache, no materialized views, no scheduled emails, no CSV/PDF/Excel exports, no AI insights, and no generic ActivityEvent API.

```
Existing domain tables
  → Dashboard / report SQL (COUNT, SUM, bounded lists)
  → GET response DTOs
```

Identity is always the authenticated User:

- Client dashboard: JWT → ClientProfile. No `clientId`.
- Trainer dashboard and client overview: JWT → TrainerProfile. No `trainerId`. Rows are **current** assignments (`ended_at IS NULL`). After reassignment, Trainer A immediately loses Client X and Trainer B gains X.
- Admin dashboard: role ADMIN only. High-level operational counts. No weights, measurements, photos, Check-In text, Trainer feedback, foods, or WorkoutSets.

`periodDays` is allowlisted `7 | 30 | 90` (default 30). Training metrics use **WorkoutSession.startedAt** and **COMPLETED** sessions only, matching Progress. `inactivityDays` is allowlisted `7 | 14 | 30` (default 7): a currently assigned ACTIVE Client qualifies when they have no COMPLETED session with `startedAt >= now − inactivityDays`, including never-completed Clients. Metrics are factual; the API never labels adherence, health, or coaching advice.

Operational Trainer lists count `User.status = ACTIVE` Clients. Disabled assigned Clients are a separate count and are excluded from pending / inactivity / missing-plan / recent-session lists.

Empty dashboards return **200** with null/zero/empty bounded structures, never 404.

| Method | Path | Roles |
| --- | --- | --- |
| GET | `/api/v1/clients/me/dashboard` | CLIENT |
| GET | `/api/v1/trainers/me/dashboard` | TRAINER |
| GET | `/api/v1/trainers/me/reports/clients` | TRAINER (paginated current assigned overview) |
| GET | `/api/v1/admin/dashboard` | ADMIN |

The trainer client overview is paginated (`page=1`, `limit=20`, max 100). Search is parameterized `ILIKE` on `firstName`/`lastName` with wildcard escaping. Optional filters: `hasActiveTrainingPlan`, `hasActiveNutritionPlan`, `hasPendingCheckIn`, `inactivityDays`. Detail remains on existing domain APIs.

### Exercise media

Media files are stored in private object storage. PostgreSQL holds metadata only. The browser uploads directly to storage with a short-lived signed POST; NestJS never receives video bytes.

Flow:

1. Authenticated ADMIN or owning TRAINER calls `POST /api/v1/exercises/:exerciseId/media/upload-requests`.
2. The API validates ownership, ACTIVE status, MIME allowlist, declared size, and per-exercise counts (PENDING_UPLOAD + READY).
3. The server creates an `ExerciseMedia` row (`PENDING_UPLOAD`) and a storage key `exercises/{exerciseId}/{mediaId}/{uuid}.{ext}`.
4. The client POSTs the file to the signed URL using the returned fields.
5. The client calls `POST /api/v1/exercises/:exerciseId/media/:mediaId/finalize`.
6. NestJS HEADs the object, checks size and reported content type, then marks `READY`.

Signed POST is used instead of signed PUT so the policy can constrain exact key, `Content-Type`, and `content-length-range`. MinIO is S3-compatible for this local development path. Upload authorization lasts `EXERCISE_MEDIA_UPLOAD_TTL_SECONDS` (5–15 minutes). Read URLs last `EXERCISE_MEDIA_READ_TTL_SECONDS`.

The bucket is private. Do not use public-read ACLs or permanent object URLs. `GET .../media/:mediaId/access` returns a short-lived GET URL for READY media.

Lifecycle: `PENDING_UPLOAD` → `READY` after HEAD verification, or `FAILED` when the uploaded object exists but metadata is incompatible (then the object is deleted). Missing objects stay `PENDING_UPLOAD`. Repeat finalize is idempotent for valid READY media. Physical delete removes the object first, then the row. Repeated delete returns 404.

HEAD metadata does **not** prove file contents. There is no malware scan, content-signature probe, or transcoding yet. A later worker can sit between upload and READY (`PENDING_UPLOAD` → scan/transcode → `READY`). Stale `PENDING_UPLOAD` rows older than several hours should be cleaned by a future maintenance task using `IDX_exercise_media_pending_created_at`. Do not add BullMQ/Redis for that yet.

Archived exercises keep existing media readable by catalog users. New uploads are rejected for both TRAINER and ADMIN.

Limits (centralized constants, not env): 5 videos and 10 images per exercise. Size caps: `EXERCISE_VIDEO_MAX_BYTES` (default 250 MiB) and `EXERCISE_IMAGE_MAX_BYTES` (default 10 MiB). Allowlisted MIME types: `video/mp4`, `video/webm`, `video/quicktime`, `image/jpeg`, `image/png`, `image/webp`.

`exercise_media.exercise_id` and `created_by_user_id` use `ON DELETE RESTRICT`. Exercises have no delete endpoint; RESTRICT avoids silently destroying media if a delete is added later.

`/api/v1/health` does not ping object storage. Auth, trainers, and clients remain usable if storage is down.

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/exercises/:exerciseId/media/upload-requests` | ADMIN, TRAINER (own) |
| GET | `/api/v1/exercises/:exerciseId/media` | ADMIN, TRAINER |
| POST | `/api/v1/exercises/:exerciseId/media/:mediaId/finalize` | ADMIN, TRAINER (own) |
| GET | `/api/v1/exercises/:exerciseId/media/:mediaId/access` | ADMIN, TRAINER |
| DELETE | `/api/v1/exercises/:exerciseId/media/:mediaId` | ADMIN, TRAINER (own) |

### ClientProfile persistence

`client_profiles.user_id` references `users.id` with `ON DELETE CASCADE` and a unique constraint. A profile cannot exist without its user.

Indexes are limited to that unique `user_id`. Filters on `primary_goal` and `experience_level` are not indexed yet — a sequential scan is acceptable at the current scale.

`date_of_birth` is a PostgreSQL `DATE`. Age is not stored. Goal classification uses `client_primary_goal`; optional `goal_notes` is plain text.

### Client HTTP API

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/clients` | ADMIN |
| GET | `/api/v1/clients` | ADMIN |
| GET | `/api/v1/clients/me` | CLIENT |
| PATCH | `/api/v1/clients/me` | CLIENT |
| GET | `/api/v1/clients/:id` | ADMIN |
| PATCH | `/api/v1/clients/:id` | ADMIN |
| PATCH | `/api/v1/clients/:id/status` | ADMIN |

There is no `DELETE /clients/:id`. Disable via status instead.

### Trainer HTTP API

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/v1/trainers` | ADMIN |
| GET | `/api/v1/trainers` | ADMIN |
| GET | `/api/v1/trainers/me` | TRAINER |
| PATCH | `/api/v1/trainers/me` | TRAINER |
| GET | `/api/v1/trainers/:id` | ADMIN |
| PATCH | `/api/v1/trainers/:id` | ADMIN |
| PATCH | `/api/v1/trainers/:id/status` | ADMIN |

There is no `DELETE /trainers/:id`. Disable via status instead.

## URLs

- API prefix: `/api/v1`
- Health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Swagger UI (development): [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- OpenAPI JSON: [http://localhost:3000/api/docs-json](http://localhost:3000/api/docs-json)

Frontend authentication: keep the access token in memory; refresh stays in the HttpOnly cookie. See [docs/security.md](docs/security.md).
