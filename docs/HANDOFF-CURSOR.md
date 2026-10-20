# Traspaso a Cursor — qué queda para entregar y después

Actualizado: 2026-10-10 · Rama: `ronny` · Autor: Claude, que orquestó con Codex mientras Ronny no estaba.

Lee primero `AGENTS.md` y `.cursor/rules/*.mdc`. Todo lo de abajo cumple esas reglas.

## 1. Qué se hizo en esta sesión (sin commit)

El módulo de suscripciones completo: **registro gratis + plan Pro pagado por SINPE Móvil.** El plan de producto está en [`docs/subscriptions/suscripciones-sinpe.md`](subscriptions/suscripciones-sinpe.md).

| Fase | Contenido | Estado |
| --- | --- | --- |
| **P1 — Backend** | Migración `1758153600000-CreateSubscriptions`, módulos `subscriptions` y `registration`, `POST /auth/register`, la puerta 409 al asignar entrenador a un cliente FREE, el cliente Orval regenerado y E2E | ✅ Aprobada |
| **P2a — Registro y textos** | `/register`, el `register` de la sesión, los botones de la landing, el login y el encabezado, la sección "Planes", los textos públicos (en/es) y el conocimiento del chatbot | ✅ Aprobada |
| **P2b — Pantallas de pago** | "Mi plan" del cliente (`/client/plan`), "Pagos" del Admin (`/admin/payments`), el plan y la cortesía en el detalle del cliente, el mensaje 409 al asignar y E2E con mocks | ✅ Aprobada |

**Nada está commiteado.** Las reglas del repo prohíben `git commit` y `git push` sin orden humana. Los commits sugeridos están en la sección 4.

## 2. Bloqueante para producción (lo decide Ronny, no Cursor)

1. **Valores reales de SINPE** en el `.env` de producción: `SUBSCRIPTION_SINPE_PHONE`, `SUBSCRIPTION_SINPE_HOLDER_NAME` y `SUBSCRIPTION_PRO_PRICE_CRC` (y `SUBSCRIPTION_PRO_PERIOD_DAYS` si no es 30).
   - Sin ellos el registro funciona, pero "Mi plan" dice que los pagos no están habilitados.
   - Ver [`docs/frontend/deploy.md`](frontend/deploy.md).
2. **Página de términos y privacidad.** El registro pide aceptar "los términos y la política de privacidad", pero esa página no existe todavía. Hace falta el texto legal. **No lo inventes.** Ronny lo provee y Cursor solo lo maqueta como una ruta pública (`/terminos`), con un enlace desde la casilla del registro.
3. **Avisar a Eli:**
   - Esta sesión tocó archivos de la línea A: `clients`, `trainer-client-assignments`, auth/sesión, `admin-workspace`, `client-dashboard`, `msw-admin.ts` y varios E2E del backend, que ahora dan PRO de cortesía antes de asignar.
   - La tarea A9 del `TEAM-PLAN` (asignada a Eli) **ya está hecha.** Eli no debe empezarla.

## 3. Tareas para Cursor, en orden

Cada una es un PR pequeño a `main`, con lint, test y build en verde.

### C1. Verificación visual en el navegador (antes de entregar)

- Levanta todo con Docker: `docker compose -f backend/docker-compose.yml up -d` y luego `docker compose -f docker/local/docker-compose.yml up -d --build`. La app queda en http://localhost:8080 (el 3000 y el 5173 los ocupa SIGASJ).
- Recorre el flujo con las cuentas QA de la base de Docker:
  1. registro;
  2. "Mi plan";
  3. reportar un pago;
  4. Admin → "Pagos" → aprobar;
  5. asignar entrenador.
- Revísalo en un ancho de 390 px y en escritorio, en es y en en.
- Usa las skills `visual-quality-review` y `responsive-accessibility-review`.
- Arregla solo los defectos visuales que encuentres.

### C2. Playwright con la API real

- Corre `frontend/e2e/subscriptions.spec.ts` y `login.spec.ts` (con mocks).
- Agrega un smoke con la API real (el patrón de A7) para: registro → reportar pago → aprobar → asignar.
- El CI ya crea usuarios E2E; extiéndelo si hace falta.

### C3. Página de términos (cuando Ronny entregue el texto)

Ver el punto 2.2.

### C4. Notificación al Admin cuando se reporta un pago (P3.3)

- Reutiliza el módulo `notifications` que ya existe (F12). Crea una notificación para cada ADMIN activo cuando un cliente reporta un pago.
- Es backend y contrato: NestJS → `api:generate` → enlace en la bandeja.

### C5. Correos de pago aprobado o rechazado (P3.2)

Reutiliza el transporte de correo de A8.1 (`MAIL_*`).

### C6. Nutrition 2.0 — N2: USDA bajo demanda

- Está en [`docs/nutrition/nutrition-2.0-reuse-analysis.md`](nutrition/nutrition-2.0-reuse-analysis.md), sección 30.
- Requiere la API key de USDA FDC (api.data.gov). Pídesela a Ronny.
- Después siguen N3 (recetas) y N4 (plantillas por días).

### C7. Deuda menor registrada en las revisiones

- **`SubscriptionsService.createPayment`:** si choca el índice de "un pago pendiente por cliente", hoy responde "comprobante ya usado". Distinguirlo por el nombre del constraint.
- **Specs lentos:** los specs de Trainer tardan unos 7 s en máquinas lentas. Se subió `testTimeout` a 15 s en `frontend/vitest.config.ts`. Si molesta, optimizar esos specs.
- **Chunk de 500 kB:** el aviso de build ya estaba antes de esta sesión. Ver `docs/frontend/performance.md`.

## 4. Commits sugeridos (cuando Ronny lo pida)

1. `feat(subscriptions): backend P1 — registro gratis, Pro por SINPE, migracion y contrato`
   - `backend/**`, `frontend/src/generated/**`, `docs/frontend/deploy.md`
2. `feat(subscriptions): P2a — pagina de registro, CTAs, textos y chatbot`
   - `frontend/src/features/auth/**`, `public-site/**`, `routes/register.tsx`, `app/**`, i18n, `vitest.config.ts`, `backend/src/modules/chat/**`
3. `feat(subscriptions): P2b — Mi plan, Pagos de Admin y E2E`
   - el resto de `frontend/**`
4. `docs: traspaso a Cursor y estado de suscripciones`
   - `docs/**`, `.gitignore`

## 5. Evidencia de la verificación final

Corrida completa `npm run ai:check:full -- --e2e` (2026-10-10), más los dos arreglos de tests que vinieron después:

| Check | Resultado |
| --- | --- |
| Backend: lint, unit (375) y build | PASS |
| Backend E2E | 181/181 (el test del chat se corrigió y se volvió a correr: 12/12) |
| Frontend: lint, Vitest (74 archivos) y build | PASS |
| Playwright con mocks | 113 pasan y 12 se omiten (los que requieren API real). `subscriptions.spec` y `login.spec` se volvieron a correr tras el arreglo: 9/9 |
| Migración | `revert` → `run` limpio. Backfill: los clientes con entrenador quedaron con Pro de cortesía |

**Bugs reales que encontraron los tests y ya están corregidos:**

- **Validación del registro:** el formulario no validaba. Usaba sintaxis de zod 4 con zod 3.
- **Botón "Iniciar sesión":** el hero lo mostraba a usuarios con sesión iniciada.
- **Botón "Reportar pago":** no enviaba el formulario porque era `type="button"`.
- **Contrato de la API:** `page` y `pageSize` se generaban como `Object`.

**Sin verificar:** la revisión visual en un navegador real (tarea C1) y el smoke con la API real (tarea C2).

## 6. Lecciones para el agente que siga

- **zod está en 3.25 con la API v3.** Los enums de Orval son objetos: usa `z.nativeEnum` o `refine`, nunca `z.enum(objeto)`. `{ error }` es sintaxis v4 y se ignora en silencio.
- **Tests con `RouterProvider`:** renderizan de forma asíncrona. Espera con `findBy*` antes de cualquier `getBy*`.
- **Finales de línea:** el repo está en CRLF. Pasa `npx eslint --fix` sobre los archivos que toques, o el lint falla con `Insert ␍`.
- **`ConfigService` usa `cache: true`:** en E2E, `config.set` no afecta a los servicios. Intercepta `config.get` y restáuralo después.
- **Puerto 3000:** en esta máquina lo ocupa SIGASJ. `api:generate` rechaza esa API por diseño. Levanta este backend en el 3100 y usa `VITE_API_URL=http://localhost:3100 npm run api:generate`.

---

## 7. Rediseño de la experiencia del cliente (2026-10-10 / 11)

Plan y estado: [`docs/client-experience/rediseno-experiencia-cliente.md`](client-experience/rediseno-experiencia-cliente.md). **R1–R4 están aprobadas**, sin commit.

| Fase | Qué cambió |
| --- | --- |
| **R1** Backend | Biblioteca pública de rutinas (`is_library_published`), "Mi rutina" (`POST /clients/me/training-plans/self`), `previousSets` en las sesiones y `npm run seed:starter-routines`. Migración `1758240000000` |
| **R2** Modo entrenamiento | Lista de ejercicios, tabla con "Anterior", marcar con ✓, descanso automático ±15 s, récords, resumen y aviso de sesión vieja |
| **R3** Inicio y Entrenamiento | Tarjeta "Hoy", pestañas Mi plan · Rutinas · Historial, español por defecto y biblioteca en Admin (`/admin/library`) |
| **R4** Pro y bienvenida | `/client/welcome` (3 pasos), "Mi plan" con comparativa, pasos SINPE y línea de tiempo, Pro en contexto y tarjeta "Tu entrenador" con WhatsApp |

**Después de hacer pull:**

```
cd backend
npm run migration:run
npm run seed:starter-routines
```

### Tareas nuevas para Cursor

- **C8. Marca unificada (R5).** Llevar el acento naranja de la landing a la app del cliente.
  - Hacerlo con un override acotado al shell del cliente; no tocar los tokens globales que usan Trainer y Admin.
  - PR pequeño, avisando a Eli.
- **C9. Catálogo en español.** Los ejercicios del pack Vital están en inglés y en minúscula ("rowing machine", "kettlebell swing").
  - Opción simple: un script que les asigne un nombre visible en español.
  - Opción completa: `displayName` por idioma, que está en el roadmap de nutrición y sirve también para ejercicios. Requiere migración.
  - **Ronny decide.**
- **C10. Smoke visual en Docker.**
  - Seguir el flujo gratis: `/register` → bienvenida → elegir rutina → Empezar ahora → registrar una serie → Inicio → "Mi plan".
  - Hacerlo en español y en inglés, a 390 px y en escritorio.
  - Se revisó el 2026-10-11 y se corrigieron 4 detalles: un "✓" mal codificado, "{{amount}}" sin reemplazar, los días de la semana en inglés y la prescripción en inglés.
- **C11. Rutinas iniciales en producción.**
  - Correr `seed:starter-routines` desde un checkout con `npm ci`, porque la imagen de producción no trae `ts-node`.
  - El Admin puede publicar más rutinas en `/admin/library`.

### Lecciones nuevas

- **Inglés en los tests.** La app abre en español. Vitest fuerza inglés con `tests/setup-language.ts` y Playwright con `storageState` en `playwright.config.ts`. Si un test prueba el idioma, debe cambiarlo de forma explícita.
- **Codificación.** Codex a veces guarda el español mal codificado ("habrÃ¡"). Antes de entregar, busca `Ã` y `âœ` con grep.
- **Suspensión del equipo.** Si la máquina entra en suspensión, Codex queda colgado (sin red ni temporizadores). Desactiva la suspensión durante tareas largas.

---

## 8. Frontend completado (2026-10-12)

Todo lo que tenía backend y le faltaba pantalla ya está hecho, sin commit:

| Tarea | Qué agrega |
| --- | --- |
| **F1** Cliente | "Mi perfil" (`/client/profile`): editar teléfono, objetivo, nivel y notas, cambiar contraseña (por correo) y cerrar sesión. Planes anteriores de entrenamiento (pestaña Historial) y de nutrición, en modo lectura. Se quitó la opción falsa de foto de comida |
| **F2** Entrenador | Editar el nombre y la descripción de una plantilla; el nombre, la descripción y las fechas de un plan; el día y las notas de cada entrenamiento; y el nombre, las fechas y las metas de un plan de nutrición |

**Verificación:**

| Check | Resultado |
| --- | --- |
| Lint, `tsc` y codificación | PASS |
| Vitest | 82 archivos, 482 tests |
| Build | PASS |
| Playwright | 113 pasan y 12 se omiten. El único fallo (el primer test de Admin, por carga en frío) pasa al correrlo solo |

**Siguen pendientes porque requieren backend:**
- cambiar la contraseña con la sesión iniciada;
- avisar al Admin cuando se reporta un pago;
- correos de pago aprobado o rechazado;
- verificar el correo al registrarse.

**Configuración:**
- **SMTP:** en local `MAIL_TRANSPORT=log` no envía correos; para probar "Olvidé mi contraseña" hay que configurar SMTP en `backend/.env` (ver `docs/frontend/deploy.md`). En producción es obligatorio.
