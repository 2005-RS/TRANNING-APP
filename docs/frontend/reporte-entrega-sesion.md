# Reporte de entrega — línea A (Eli)

Fecha: 2026-09-30. Rama: `Eli` (mayúsculas exactas). Remoto: `origin/Eli`.

Este documento cierra la sesión de trabajo de F14 / línea A. No avanza `docs/frontend/current-task.md` ni el estado VERIFIED del roadmap: esa decisión sigue siendo humana. El reporte técnico en inglés de la fase está en [f14-report.md](./f14-report.md).

**Estado de entrega al escribir este archivo:** el código de la sesión ya estaba en `origin/Eli` hasta `5cc70f4`. Quedaba un desfase de contrato (summary de `/health`) que hacía fallar CI. Este cierre regenera el cliente Orval y documenta resultados reales. **No hay despliegue a producción.**

---

## 1. Qué significan los identificadores

| Id | Significado |
| --- | --- |
| **F14** | Fase del roadmap frontend: *Frontend Hardening / Production*. Endurece lo ya construido (accesibilidad, rendimiento, errores, seguridad, E2E, huecos de producto, artefactos de release). No es un dominio de negocio nuevo. En `current-task.md` F14 aún no está marcado VERIFIED. |
| **F15** | Solo aparece como “siguiente id” en el reporte de fase. **No se implementó.** No hay tarea F15 en el roadmap canónico. |
| **A1–A8** | Tareas de la línea A en [TEAM-PLAN.md](../TEAM-PLAN.md). Eli las ejecuta en la rama `Eli`. |
| **A3** | Accesibilidad: axe en E2E (serias/críticas = fallo) y teclado. |
| **A4** | Rendimiento y bundle: visualizador, Lighthouse, skeletons ociosos. |
| **A5** | Errores consistentes (401/403/404/500/offline), boundary de React, CSP del SPA, `AUTH_E2E_SKIP_THROTTLE` bloqueado en producción. |
| **A6** | Producción y release: imagen del SPA, health de storage, docs de despliegue, reporte F14. |
| **A7** | Ampliar E2E reales: Trainer, Admin, notificaciones. |
| **A8.1** | Recuperar contraseña (email + token de un solo uso). |
| **A8.2** | Editor de perfil del Trainer (`GET/PATCH /trainers/me`). |
| **A8.3** | Duplicar plantilla de entrenamiento (endpoint + botón). |
| **A8.4** | Contador de no leídas en el dashboard de Admin (`notifications.unreadCount`). |
| **Línea B** | Ronny (`origin/ronny`): landing, login visual, nutrición. Esta sesión no fusionó esa rama. |

Orden ejecutado en esta sesión (después de A1/A2 ya en el historial): A3 → A4 → A5 → A7 → A8.1 → A8.2 → A8.3 → A8.4 → A6, más este cierre.

---

## 2. Qué se implementó, corrigió o configuró (por funcionalidad)

### Accesibilidad (A3) — `7735f7c`

- `@axe-core/playwright` en E2E de Client, Trainer, Admin y notificaciones.
- Violaciones serias/críticas fallan la suite.
- Cobertura de teclado (foco, sheets, menús).
- Rutas de línea B: solo reporte en TEAM-PLAN, sin correcciones.

### Rendimiento (A4) — `a9dfb5d`

- Análisis de bundle (`rollup-plugin-visualizer`).
- Recharts, Motion y WebGL fuera del chunk de entrada.
- Skeletons de fotos de progreso que no se habían pedido dejan de animar en idle.
- Baseline Lighthouse en `docs/frontend/performance.md`.

### Errores y seguridad (A5) — `84beb3b`

- `AppErrorBoundary` global.
- Clasificación de fallos: 401, 403, 404, 500, red.
- `AUTH_E2E_SKIP_THROTTLE` ignorado y rechazado en producción.
- Política CSP del SPA documentada (hash del script inline de tema).

### E2E ampliados (A7) — `098b59c`

- Flujos Trainer: crear plantilla, asignar plan, revisar check-in.
- Flujos Admin: crear trainer, asignar, desactivar.
- Notificaciones de punta a punta (con API real cuando hay credenciales).

### Recuperar contraseña (A8.1) — `72bf3ec`

- Tabla `password_reset_tokens` (migración TypeORM).
- `POST /api/v1/auth/forgot-password` (202, anti-enumeración) y `POST /api/v1/auth/reset-password` (204).
- SMTP: `log` fuera de producción; `smtp` obligatorio en producción.
- Pantallas SPA `/forgot-password` y `/reset-password`; token en el fragmento de URL, se quita tras leerlo, no se registra en logs.
- Enlace “¿Olvidaste tu contraseña?” en `login-page.tsx` (toque mínimo de línea B, documentado).

### Perfil del Trainer (A8.2) — `16231a3`

- Editor sobre el contrato existente `GET/PATCH /trainers/me`.
- Entrada en el sidebar del workspace Trainer.

### Duplicar plantilla (A8.3) — `326fbb5`

- `POST /api/v1/workout-templates/:id/duplicate` → 201, DRAFT del llamador.
- Cliente generado `workoutTemplatesDuplicate` + `DuplicateWorkoutTemplateDto` (Orval, sin editar a mano).
- Botón Duplicate en el detalle de plantilla del Trainer.

### Dashboard Admin: no leídas (A8.4) — `902fad9`

- El dashboard Admin muestra `data.notifications.unreadCount` (mismo payload de `useAdminDashboardGetSystem`).
- Enlace “Open inbox” a `/admin/notifications`.
- Cero no leídas sigue mostrando el enlace. Client/Trainer dashboards **no** renderizan ese campo (hueco conocido).

### Producción y release (A6) — `5cc70f4`

- `frontend/Dockerfile` (Node 22 + nginx 1.27), `.dockerignore`, `docker/nginx.conf.template` (SPA `try_files` + CSP).
- `docs/frontend/deploy.md`: origen único, `VITE_API_URL` horneado en el build, `TRUST_PROXY`, checklist.
- Health Terminus: PostgreSQL + ping de object storage (`HeadBucket` en S3; no-op en memory). Timeout de 1500 ms con `clearTimeout` en `finally`.
- `GET /api/v1/health` incluye `info.storage.status`.
- `TRUST_PROXY` documentado en `.env.example` y el runbook.

### Cierre de entrega (este reporte)

- Regeneración de `frontend/src/generated/health/health.ts`: el summary de OpenAPI cambió en A6 (“…and object-storage bucket reachability”) y CI exigía el cliente al día. Solo JSDoc; sin campos nuevos.
- Este archivo.

**No se hizo:** deploy real, UI de registro, nutrición/landing (línea B), importar el pack Vital, compilar seeds con `ts-node` dentro de la imagen recortada, merge a `main`/`master`, force push.

---

## 3. Pruebas y compilaciones

Hay que separar **local** (esta máquina) de **CI** (GitHub Actions en `Eli`). Una suite local no sustituye CI, y un job verde no sustituye otro que falló o se saltó.

### 3.1 CI en GitHub Actions (rama `Eli`)

Workflow: `.github/workflows/ci.yml` (push). Concurrencia `cancel-in-progress: true` (un push nuevo cancela el run anterior de la misma rama).

| Commit | Título | Conclusión | Notas |
| --- | --- | --- | --- |
| `a9dfb5d` A4 | success | — |
| `84beb3b` A5 | **failure** | Superado por commits posteriores (A7 en adelante verdes hasta A8.3). |
| `098b59c` A7 | success | — |
| `72bf3ec` A8.1 | success | — |
| `16231a3` A8.2 | success | — |
| `326fbb5` A8.3 | success | Último run **completo en verde** de esta sesión. |
| `902fad9` A8.4 | **cancelled** | Cancelado al empujar A6 (concurrencia). No hay veredicto propio de A8.4. |
| `5cc70f4` A6 | **failure** | Ver detalle abajo. [Run 36749053406](https://github.com/2005-RS/TRANNING-APP/actions/runs/36749053406) |

Jobs del run A6 (`5cc70f4`):

| Job | Resultado |
| --- | --- |
| Backend (lint, build, unit, e2e) | **success** |
| Backend (MinIO storage e2e) | **success** |
| Frontend (lint, test, build) | **success** |
| E2E (Playwright + real API) | **failure** |

Pasos del job E2E en A6:

- Playwright mocked API: **success** — anotación del run: **110 passed, 12 skipped** (5,3 min). Esto cubre la suite mocked, no el smoke con API real.
- “Generated API client matches the backend contract”: **failure** — `frontend/src/generated is out of date` (summary de health).
- Create E2E users: **skipped** (no se ejecutó).
- Playwright real API smoke: **skipped** (no se ejecutó).

Por tanto: **no se puede presentar el run A6 como validación E2E completa.** El smoke real no corrió. El cliente regenerado debe volver a pasar ese job en un commit posterior.

### 3.2 Local (estación de Eli, Windows)

Node 22 (WinGet). Playwright canónico pide `channel: 'chrome'`; esta máquina tiene Microsoft Edge, no Chrome. La verificación local de Playwright usó `playwright.local.config.ts` con `channel: 'msedge'` (**no está en git**; no subirla).

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Frontend `npm run lint` | 0 errores (ventana A8.4) | eslint |
| Frontend `npm test` (Vitest) | **67 archivos, 407 tests passed** | unidad/integración UI, no E2E |
| Frontend `npm run build` | passed (`VITE_API_URL=http://localhost:3000`) | **no** es artefacto de producción |
| Backend `npm run lint` / `build` | passed (A6) | — |
| Backend unit health/storage | **4 passed** | `storage.health.spec.ts` + adapter memory |
| Backend `health.e2e-spec.ts` | **1 passed** | incluye `info.storage.status=up` |
| Backend workout-templates e2e (A8.3) | **14 passed** | no es toda la suite e2e |
| Backend e2e completo local en el cierre | **no reejecutado** | CI A6 sí lo pasó |
| Playwright `trainer-workspace.spec.ts` | **20 passed**, 1 skipped (smoke real) | Edge, no Chrome |
| Playwright Admin “manages platform” | **1 passed** | unread + Open inbox |
| Playwright suite completa local | **no ejecutada** | falta Chrome; CI mocked 110 passed en A6 |
| `npm run api:generate` (cierre) | **passed** | 92 paths, 486 archivos; diff real = 2 líneas de JSDoc en health |
| Build Docker de frontend/backend local | **no ejecutado** | — |
| Lighthouse re-medido en este cierre | **no** | baseline ya en A4 |

### 3.3 Qué no se debe tratar como validación completa

- Vitest 407 ≠ Playwright.
- 110 Playwright mocked ≠ smoke con API + usuarios semilla.
- Build de CI/local con `VITE_API_URL=http://localhost:3000` ≠ imagen de producción.
- A8.4 no tiene run de CI propio (cancelado).

---

## 4. Despliegue real

**No hubo despliegue** a ningún entorno cloud, staging o producción.

Lo que existe es preparación:

- Imagen SPA documentada, no construida ni publicada en este cierre.
- Health de storage verificado en tests/CI backend, no contra un bucket de producción.
- Checklist de operadores en [deploy.md](./deploy.md).

Verificación de “¿está en producción?”: no aplica.

---

## 5. Pendiente para producción

### Imprescindible (bloquea un release real)

1. **CI verde en el HEAD de `Eli`**, incluyendo el paso de contrato Orval y el smoke Playwright con API real. El HEAD previo `5cc70f4` está rojo por el cliente generado.
2. **Merge a `main` por GitHub UI** (flujo del equipo). Esta entrega **no** fusiona `main`.
3. **Origen HTTPS único** (SPA + `/api` + `/socket.io` detrás del mismo host). Sin eso la cookie de refresh `SameSite=Lax` no es segura/correcta.
4. **Build de frontend con `VITE_API_URL` público https** (build-arg). No desplegar el artefacto de CI (localhost).
5. **`TRUST_PROXY=true`** detrás del proxy.
6. **Secretos de producción** (JWT ≥ 32, DB, S3, SMTP, `DEEPSEEK_API_KEY`). Nunca en git ni en `VITE_*`.
7. **Migraciones explícitas** (`synchronize: false`, no auto-run al boot), backup Postgres + bucket juntos.
8. **`MAIL_TRANSPORT=smtp`** y `APP_PUBLIC_URL` https; si no, recuperar contraseña no entrega correo.
9. **`AUTH_E2E_SKIP_THROTTLE` ausente** (producción rechaza el arranque si está definido).
10. **Catálogo de ejercicios**: el pack Vital no está en git. Una base recién migrada no tiene ejercicios hasta el import privado.

### Opcional / no bloquea el código de línea A

- UI de registro (hueco conocido).
- `unreadCount` en dashboards Client y Trainer (inbox F12 ya existe).
- Completar nutrición y landing (línea B).
- Seeds/`ts-node` dentro de la imagen recortada (se corren desde checkout o CI con `npm ci` completo).
- Chrome en la máquina de Eli (CI usa Chrome).
- Hash CSP: construir imágenes en Linux/LF; un checkout CRLF rompería el script inline.
- Listado masivo de asignaciones Admin; roster Trainer-client si el contrato no lo da.

---

## 6. Qué necesita Ronny (o cualquiera) para ejecutar estos cambios

Trabajar sobre `origin/Eli` **sin** tirar su trabajo en `ronny`. Ver sección 7.

### Dependencias

- Node.js **22**, npm.
- Docker (PostgreSQL 16 y MinIO Chainguard vía `backend/docker-compose.yml`).
- En `backend/` y `frontend/`: `npm ci` (o `npm install` si se acepta lockfile).
- Playwright: `npx playwright install chrome` (o el navegador que use CI). El config canónico es `channel: 'chrome'`.

### Variables de entorno (nombres, sin secretos)

Copiar ejemplos, no commitear `.env`.

**Frontend** (`frontend/.env.example`):

- `VITE_API_URL` — origen absoluto del API, sin path ni barra final. Local típico: `http://localhost:3000`.
- `VITE_APP_ENV` — opcional en local; `production` exige https en `VITE_API_URL`.

Nada más en `VITE_*`. Jamás JWT, SMTP, DB ni DeepSeek ahí.

**Backend** (`backend/.env.example`): `NODE_ENV`, `PORT`, `TRUST_PROXY` (false en local), `DATABASE_*`, `CORS_ORIGIN` (incluir `http://localhost:5173`; añadir `http://localhost:4173` solo para Playwright con API real), `JWT_ACCESS_*`, cookies de refresh, `OBJECT_STORAGE_*` (local: driver `s3`, endpoint MinIO `http://localhost:9100`, bucket `training-exercise-media`), `AI_PROVIDER` (local `mock`), `APP_PUBLIC_URL`, `MAIL_TRANSPORT` (local `log`).

Compose local: `POSTGRES_*`, `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` (defaults de desarrollo en compose; no usarlos en producción).

### Migraciones

Desde `backend/`, con Postgres arriba:

```bash
npm run migration:run
```

Incluye `1757980800000-CreatePasswordResetTokens` (`password_reset_tokens`). `synchronize` permanece `false`.

Opcional: `npm run seed:admin` (no corre al boot). Import de ejercicios: `npm run import:exercise-library` con el pack privado (no está en el repo).

### Arranque local

```bash
# 1) Infra
cd backend && docker compose up -d

# 2) API (tras .env y migraciones)
npm run start:dev

# 3) SPA
cd ../frontend
npm run dev
```

Puertos: frontend 5173, API 3000, preview E2E 4173, Postgres 5432, MinIO 9100/9101. Si 3000/5173 están ocupados (otro proyecto), usar otro `PORT` + el mismo origen en `VITE_API_URL`. Ver [local-environment.md](./local-environment.md).

Health: `GET /api/v1/health` → `postgres` y `storage` en `up`.

---

## 7. Cómo bajar `Eli` sin perder trabajo propio

`Eli` y `ronny` son ramas distintas. **No** hagas merge a `main` desde aquí. **No** uses force push.

Si estás en `ronny` (o cualquier otra rama) con cambios locales:

```bash
git status
git stash push -u -m "wip-ronny"
git fetch origin
git branch -a | findstr Eli
# Inspeccionar sin cambiar de rama:
git log --oneline origin/Eli -15
```

Para **ejecutar** el código de Eli:

```bash
git checkout Eli
git pull origin Eli
```

Para **volver** a tu rama y recuperar el stash:

```bash
git checkout ronny
git stash pop
```

Si quieres **traer** cambios de Eli a `ronny` (solo si lo decides tú; puede haber conflictos en archivos compartidos como `frontend/src/generated/**`):

```bash
git checkout ronny
git fetch origin
git merge origin/Eli
```

No resuelvas conflictos de contrato OpenAPI a mano: gana el backend + `npm run api:generate`.

Clon fresco:

```bash
git clone -b Eli https://github.com/2005-RS/TRANNING-APP.git
```

---

## 8. Commits de esta línea de trabajo (sesión)

Hasta el cierre, en `Eli`, de más reciente a más antiguo en el tramo F14:

1. `5cc70f4` — A6 Produccion y release: imagen SPA, health de storage y reporte F14
2. `902fad9` — A8.4 Contador de no leidas en el dashboard de Admin
3. `326fbb5` — A8.3 Duplicar plantilla de entrenamiento
4. `16231a3` — A8.2 Editor de perfil del Trainer
5. `72bf3ec` — A8.1 Recuperar contrasena: flujo por email con token de un solo uso
6. `098b59c` — test(e2e): real-backend Admin, Trainer and notification workflows (A7)
7. `84beb3b` — fix(errors): classify failures by kind, add app error boundary, lock E2E throttle switch out of production
8. `a9dfb5d` — perf(f14): add bundle analysis, record Lighthouse baseline, stop idle photo skeletons
9. `7735f7c` — feat(a11y): gate E2E on serious axe violations and fix keyboard focus

Más los commits de este cierre (cliente health + este reporte), que deben aparecer en `git log origin/Eli` tras el push.

Rama en GitHub: https://github.com/2005-RS/TRANNING-APP/tree/Eli
