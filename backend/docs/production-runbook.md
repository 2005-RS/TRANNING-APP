# Production runbook

Vendor-neutral operations guide for Backend V1. Do not put real passwords in this file.

## Recommended topology

Browser --HTTPS--> reverse proxy (TLS)

- `/` → SPA (see `docs/frontend/deploy.md` and `frontend/Dockerfile`)
- `/api` and `/socket.io` → NestJS API

NestJS API --> PostgreSQL  
NestJS API --> private S3-compatible object storage  

The SPA and API must share one https origin. The refresh cookie is HttpOnly with path `/api/v1/auth` and there is no CSRF token; split origins would require `SameSite=None`. Full table of variables, seeds, and the release checklist: [`docs/frontend/deploy.md`](../../docs/frontend/deploy.md).

Nest does not terminate TLS. Set `TRUST_PROXY=true` whenever a trusted proxy is forwarding client protocol/IP. Leaving it `false` behind a proxy breaks Secure cookies (`req.secure`) and the IP used by throttling. Default `false` is only for a process that sees the real client connection.

## Required environment

See `.env.example` for the full grouped list.

Production-required:

- `NODE_ENV=production`
- `PORT`
- `TRUST_PROXY=true` when a reverse proxy terminates TLS / forwards client IP
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `DATABASE_SSL=true` for managed PostgreSQL that requires TLS
- `CORS_ORIGIN` explicit https origins (never `*`)
- `JWT_ACCESS_SECRET` (min 32 chars, not a placeholder)
- `JWT_ACCESS_EXPIRES_IN`, `JWT_ACCESS_ISSUER`, `JWT_ACCESS_AUDIENCE`
- `AUTH_REFRESH_TTL_DAYS`, `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAME_SITE` (`lax` for same-site; `none` only for true cross-site plus Secure)
- `OBJECT_STORAGE_DRIVER=s3` plus region, bucket, access key, secret key
- Object-storage TTL and size caps

Optional:

- `HTTP_JSON_BODY_LIMIT_BYTES` (default 262144)
- `SWAGGER_ENABLED` (default false in production)
- `DATABASE_POOL_MAX` (default 10)
- `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_IDLE_TIMEOUT_MS`
- `DATABASE_SLOW_QUERY_MS` (default 0; enable only while diagnosing)

The process fails at startup if required production values are missing or weak.

## Database

PostgreSQL 16. `synchronize=false`. `migrationsRun=false`. Schema changes are migrations only.

Connection pool, connect timeout, and idle timeout are configurable. SSL is off locally and should be enabled for managed production PostgreSQL.

## Migration procedure

Do **not** auto-run migrations on application boot.

1. Build/push the release artifact (compiled `dist` image).
2. Run migrations as an explicit job against the target database:

   ```bash
   NODE_ENV=production npm run migration:run:prod
   ```

   From source (operators/CI):

   ```bash
   npm run migration:run
   ```

3. If migrations succeed, start the API (`node dist/main.js` or the container CMD).
4. Confirm `GET /api/v1/health` returns 200 with `info.postgres.status=up` and `info.storage.status=up`.
5. Route traffic.

Rollback: restore PostgreSQL from a tested backup, then deploy the previous application image. `migration:revert` is for the `training_test` database during development, not a production rollback strategy.

## Start command

```bash
npm run build
NODE_ENV=production npm run start:prod
```

Container:

```bash
docker build -t training-backend:v1 .
docker run --rm -p 3000:3000 --env-file /secure/path/prod.env training-backend:v1
```

Never bake `.env` into the image. Never copy secrets into the build context.

## Health

`GET /api/v1/health`

- Unauthenticated and not rate-limited
- PostgreSQL ping and object-storage bucket ping (`HeadBucket` / in-memory no-op)
- Does not expose hostnames, credentials, SQL, or stack traces

Graceful shutdown: `app.enableShutdownHooks()`. SIGTERM/SIGINT stop accepting work and close the Nest/TypeORM lifecycle.

## Swagger

- Development/test: `/api/docs` and `/api/docs-json` enabled
- Production: disabled unless `SWAGGER_ENABLED=true`

Frontend OpenAPI/Orval generation should use a development or explicitly enabled document, not a public production Swagger UI.

## Object storage

Production uses a private S3-compatible bucket. Local MinIO (`localhost:9100`) is development infrastructure only. Do not hard-code MinIO URLs in application code. Do not rename the existing local bucket during routine operations.

## Rate limits

Documented in `docs/security.md`. Login 8/min, refresh 12/min, upload-request 20/min, global 120/min, health exempt.

## Backups

PostgreSQL:

- Daily logical dump at minimum; more frequent for active training data
- Retain according to legal/product policy (suggested 14–30 days plus monthly archives)
- Test restore on a disposable database, never on live `training`

Example (no real passwords):

```bash
pg_dump -Fc -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f backup.dump
pg_restore --clean --if-exists -h "$DATABASE_HOST" -U "$DATABASE_USER" -d training_restore backup.dump
```

Object storage:

- Enable provider versioning and/or cross-bucket replication
- Database metadata (`storage_key`) must be restored together with objects; restoring only one side produces orphans

## Restore notes

Restoring PostgreSQL without the matching object-storage objects leaves media/photo metadata that cannot be read. Restoring objects without metadata leaves unreachable blobs. Treat them as one restore unit.

Do not restore over the live development volume `backend_training_postgres_data`.

## Local Docker

Live Postgres used by this machine:

- Container: `backend-postgres-1`
- Volume: `backend_training_postgres_data`
- Do not remove either

Compose file project name is `backend` so `docker compose up -d` from `backend/` attaches to that live stack.

MinIO: `backend-minio-1` on 9100/9101, volume `backend_training_minio_data`. `backend-minio-init-1` creates the bucket once and exits 0; that is its normal end state.

Do not `docker compose down -v`. It deletes both volumes. After that the schema comes back with `npm run migration:run`, but local users and any imported exercise library have to be recreated (`npm run seed:admin` with `INITIAL_ADMIN_*`, then `npm run import:exercise-library`).

The leftover `training-app-*` container and volume from the old Compose project name no longer exist.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Process exits at boot | Env validation error. Missing/weak production secret or CORS `*` |
| 401 after disable | Expected. Sessions were revoked |
| Refresh cookie missing | Path is `/api/v1/auth`. Secure/SameSite vs HTTP |
| 403 vs 404 | Wrong role is 403. Foreign resource is 404 |
| Swagger 404 in production | Default. Set `SWAGGER_ENABLED=true` only if required |
| Health 503 | PostgreSQL or object storage unreachable. Response stays sanitized |
| Slow queries | Temporarily set `DATABASE_SLOW_QUERY_MS` or use `EXPLAIN ANALYZE` on a copy |

## Admin seed

`npm run seed:admin` is explicit and does not run on boot. Production refuses `admin@example.com` / example.com and known default passwords. The password is never logged.

The production image is pruned (`npm prune --omit=dev`). `seed:admin` and `import:exercise-library` are `ts-node` scripts, so they are **not** runnable inside that image. Run them from a source checkout or a CI job with a full `npm ci`. The Vital Animations pack is not in git (`/assets/import/vital-animations/**`); a newly migrated database has no exercise catalog until an operator imports it. Details: [`docs/frontend/deploy.md`](../../docs/frontend/deploy.md).
