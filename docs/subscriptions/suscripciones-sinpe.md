# Módulo de suscripciones — Plan gratis + Pro pagado por SINPE Móvil

**Asignado a:** Eli (línea A) · **Producto:** Ronny · **Creado:** 2026-10-01
**Estado:** P1 planificada y lista (`.ai/CURRENT_TASK.md`, `STATUS: READY`). P2 y P3 están pendientes.

## Por qué

Hoy las cuentas solo las crea el Admin y no existe ningún cobro. Queremos dos cosas:

- **Registro libre:** cualquier persona crea su propia cuenta **FREE** desde el sitio público y usa la app sin entrenador ni nutricionista.
- **Plan PRO:** incluye un profesional asignado. Por ahora se paga **por SINPE Móvil** a la cuenta del Banco Nacional del negocio, y un Admin verifica cada pago a mano.

La pasarela con tarjeta (ONVO Pay o Tilopay, con cobro recurrente) llega más adelante. El negocio primero tiene que inscribirse en Hacienda. Por eso el modelo de datos ya tiene `provider`: la pasarela se suma como un proveedor más, sin rehacer nada.

## Decisiones de producto (cerradas)

| # | Decisión |
| --- | --- |
| S1 | El registro público crea siempre un `CLIENT` con plan FREE y sesión iniciada. No hay verificación de correo en P1. |
| S2 | El plan efectivo se calcula al leer: **PRO** si el cliente tiene `complimentary`, o si `pro_until > ahora`. Si no, **FREE**. No hay cron. |
| S3 | El cliente paga por SINPE y **reporta** el pago (comprobante y fecha). El Admin lo **aprueba o rechaza**. Al aprobar se extiende PRO un periodo (30 días por defecto), contando desde el vencimiento actual si todavía está vigente. |
| S4 | El monto lo fija el servidor desde la configuración. Un comprobante no se puede usar dos veces, y un cliente solo puede tener un pago pendiente a la vez. |
| S5 | Solo se puede asignar entrenador a clientes PRO (409 si es FREE). Quitar una asignación nunca se bloquea. |
| S6 | Cuando el PRO vence no se quita el entrenador solo. El Admin ve la lista "vencidos con entrenador" y lo quita a mano. |
| S7 | El Admin puede dar **PRO de cortesía** sin vencimiento. La migración se lo da a todo cliente que hoy tiene entrenador, para que nadie pierda acceso. |
| S8 | El número SINPE, el titular y el precio van en variables de entorno, nunca en el repo. Si faltan, el registro funciona pero reportar un pago responde 503. |

## Fases

### P1 — Backend, migración y contrato de API

**El plan completo y ejecutable está en [`.ai/CURRENT_TASK.md`](../../.ai/CURRENT_TASK.md).** Ese archivo es la fuente de verdad. Resumen:

- **Migración:**
  - `client_subscriptions` (una fila por cliente);
  - `subscription_payments` (provider `SINPE_MOVIL`, estado `PENDING | APPROVED | REJECTED`);
  - backfill de las filas existentes.
- **Variables de entorno:**
  - `SUBSCRIPTION_SINPE_PHONE`
  - `SUBSCRIPTION_SINPE_HOLDER_NAME`
  - `SUBSCRIPTION_PRO_PRICE_CRC`
  - `SUBSCRIPTION_PRO_PERIOD_DAYS`
- **Módulo `subscriptions`:**
  - `GET` y `POST /clients/me/subscription…` para el cliente;
  - `/admin/subscription-payments`, aprobar o rechazar, cortesía y la lista de vencidos, para el Admin.
- **`POST /auth/register`:** endpoint público con throttle. Reutiliza `ClientsService.create` y `AuthService.login`.
- **Puerta de asignación:** 409 en `PUT /clients/:clientId/trainer` si el cliente es FREE.
- **`npm run api:generate`.**

**Cómo correrla:** `npm run ai:implement` → `ai:check:fast` → `ai:review` → `ai:check:full`, y luego un PR propio a `main`.

### P2 — Pantallas (se planifica con `npm run ai:plan` cuando P1 esté aprobada)

**Público y login** (son archivos de la línea B; Ronny autoriza tocarlos para esta tarea; antes, traer su último merge):
- Ruta `/register`, con nombre, correo, contraseña, objetivo, experiencia y aceptación de términos. Al terminar entra directo a `/client`.
- Botones "Crear cuenta gratis" en la landing y en el login.
- Actualizar la copia pública. `frontend/src/features/public-site/copy.ts` dice hoy "No prices, sign-up".
- Actualizar el chatbot (`backend/src/modules/chat/chat-system-prompt.ts` y `public-assistant-knowledge.ts`), que hoy dice que no hay registro ni pagos. **Nunca inventar el precio:** remitir a la app.

**Cliente:**
- Página **"Mi plan"**, que muestra:
  - el plan actual y su vencimiento;
  - las instrucciones SINPE (número, titular y monto);
  - un formulario para reportar el pago;
  - los estados "pendiente de verificación", "rechazado (motivo)" y "PRO hasta…".
- Una entrada de navegación y una tarjeta en el dashboard para los clientes FREE.

**Admin:**
- Página **"Pagos"**, con los pendientes primero y las acciones aprobar y rechazar con `confirm-sheet`.
- Un badge con el plan en la lista y el detalle de clientes, y un interruptor de cortesía.
- La lista "vencidos con entrenador", con un acceso para terminar la asignación.
- En la asignación de entrenador, mostrar el 409 de "cliente sin Pro" con un mensaje claro.

**Errores:** traducir a español los mensajes 409 y 503 (las constantes vienen de `subscriptions.constants.ts`).

**E2E:** registro → reportar pago → Admin aprueba → asignar entrenador.

### P3 — Después (cada punto es una tarea aparte; se decide con Ronny)

1. **Valor del plan FREE:** que el cliente arme su propio plan de entrenamiento desde la biblioteca de `workout-templates`, y metas de nutrición automáticas con `nutrition-engine`. Hoy los planes de cliente son de solo lectura y los crea un profesional.
2. **Verificación de correo** en el registro, y correos de "pago aprobado" o "pago rechazado".
3. **Notificación al Admin** cuando alguien reporta un pago.
4. **Pasarela con tarjeta y cobro recurrente** (ONVO o Tilopay): checkout alojado, webhooks firmados e idempotentes, y portal para cambiar tarjeta o cancelar. Depende de que el negocio esté inscrito en Hacienda.
5. **Rol de nutricionista:** columna `kind` en las asignaciones (un profesional activo por tipo) y, si se decide, más planes (Entrenamiento, Nutrición, Completo).

## Seguridad (resumen; el detalle está en `.ai/CURRENT_TASK.md`)

- **Registro:**
  - el rol lo fuerza el servidor;
  - `forbidNonWhitelisted` rechaza campos extra;
  - throttle por IP;
  - política de contraseñas;
  - el token de acceso vive en memoria y el refresh en una cookie HttpOnly, igual que en el login.
- **Aprobación:** es transaccional e idempotente. Aprobar dos veces da 409.
- **Logs:** nunca registrar el comprobante, el teléfono del pagador, la contraseña ni los tokens.
- **Banco:** la app nunca verifica el banco sola. El Admin es la frontera de confianza.

## Antes de probar en local

En `backend/.env`, pon un número SINPE de prueba, el titular y el precio mensual en colones. Ronny confirma los valores reales para producción.
