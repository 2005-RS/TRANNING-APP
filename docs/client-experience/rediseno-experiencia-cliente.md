# Rediseño de la experiencia del cliente (gratis y Pro)

**Fecha:** 2026-10-10 · **Producto:** Ronny · **Orquestación:** Claude (plan y revisión) + Codex (implementación)

## 1. Qué se investigó

### Referentes del mercado

| App | Qué hace bien para el cliente |
| --- | --- |
| [Hevy](https://www.hevyapp.com/features/) | Muestra los **valores de la sesión anterior** al registrar cada serie. **Descanso automático** al marcar la serie, ajustable de ±15 s. Avisa en vivo cuando hay un **récord personal**. Tiene **resumen al terminar**, **biblioteca de rutinas** y opción de empezar un **entrenamiento vacío** |
| StrengthLog, The Log, Torqe ([referencia](https://help.strengthlog.com/help-article/copy-sets-from-last-workout/)) | La **sesión anterior siempre visible**, la opción de **copiar las series de la última vez** y una **sugerencia de progresión** (subir peso o repeticiones) |
| Trainerize, TrueCoach, Everfit ([comparativa](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach)) | El cliente ve el **entreno de hoy** sin buscarlo, con recordatorios, hábitos, mensajes con el coach y videos del ejercicio. TrueCoach destaca por la **simplicidad** |
| Apps freemium ([patrones](https://screensdesign.com/showcase/fiton-workouts-fitness-plans)) | La versión gratis **ya da valor**. El upgrade se ofrece **en contexto**, en el momento en que el usuario lo necesita, no con un muro |

### La app hoy (capturas a 390 px con el cliente QA y con un cliente gratis nuevo)

1. **El plan gratis no deja entrenar.**
   - El backend solo inicia una sesión desde un plan ACTIVO creado por un entrenador.
   - Un cliente gratis ve "Aún no hay plan asignado" en Inicio y en Entrenamiento, y no tiene ningún botón para hacer algo.
   - La landing promete "Registra entrenamientos y progreso" en el plan gratis.
   - **Es el problema número uno.**
2. **El registro de series es pobre:**
   - la carga arranca en **0 kg**;
   - **no muestra lo que hizo la vez pasada**;
   - se ve un solo ejercicio a la vez, sin vista de conjunto;
   - un cuadro grande vacío ocupa media pantalla cuando no hay video;
   - "Terminar entrenamiento" parece activo aunque no lo está.
3. **Sesiones abandonadas.** Una sesión de hace 10 días sigue "en curso" en Inicio, sin aviso ni opción clara de cerrarla.
4. **Idioma.** La app arranca en **inglés** aunque el mercado es Costa Rica y el navegador está en `es-CR`.
5. **"Mi plan"** es una lista de texto plano. No muestra qué gana el cliente con Pro ni en qué paso va su pago.
6. **Inicio** apila 6 tarjetas del mismo peso visual, y la acción principal del día no destaca.
7. **Marca.** La landing es negra con naranja y la app del cliente es azul. Al registrarse parece otro producto.

## 2. Principios del rediseño

1. **Una acción principal por pantalla.** Inicio responde "¿qué hago hoy?" con un solo botón.
2. **El gratis sirve de verdad.** Un cliente gratis entrena desde la biblioteca de rutinas, registra su progreso y usa el diario de comidas.
3. **Pro se ofrece en contexto.** El upgrade aparece donde aporta: "¿Quieres que un entrenador ajuste esta rutina?". Nunca bloquea lo gratis.
4. **Registrar una serie en 1 o 2 toques.** La serie viene prellenada con lo de la vez pasada o con lo prescrito, y se marca con ✓.
5. **Progreso visible.** Récords, racha semanal y un resumen al terminar.
6. **Español primero**, con el inglés disponible.

## 3. Cliente gratis y cliente Pro: qué ve cada uno

| Área | Gratis | Pro |
| --- | --- | --- |
| Entrenamiento | Elige rutinas de la **biblioteca** y arma "Mi rutina" | Plan hecho por **su entrenador**. La biblioteca queda como extra |
| Registro de series | Igual para ambos: anterior, ✓, descanso automático, récords y resumen | Igual |
| Progreso y medidas | Sí | Sí, y el entrenador lo revisa |
| Nutrición | Diario de comidas | Diario y plan de su entrenador |
| Check-ins | — (con invitación a Pro) | Revisados por el entrenador |
| Mi plan | Comparativa y pago por SINPE | Estado, vencimiento y renovación |

## 4. Fases (cada una es una tarea del flujo Claude + Codex)

### R1 — Backend: el cliente gratis puede entrenar

- **Biblioteca pública de rutinas:**
  - flag `is_library_published` en `workout_templates`, que el ADMIN publica o despublica, solo para plantillas ACTIVE;
  - `GET /clients/me/workout-library` (lista con ejercicios) y `GET /clients/me/workout-library/:id`.
- **"Mi rutina":**
  - `POST /clients/me/training-plans/self` con `{ name?, workoutTemplateIds[1..7] }`;
  - crea un plan ACTIVO del propio cliente copiando las plantillas;
  - archiva su plan propio anterior;
  - **409** si el cliente tiene un plan ACTIVO hecho por su entrenador, porque ese manda.
- **Rendimiento anterior:** cada ejercicio de la sesión trae `previousSets` (series de la última sesión COMPLETED con ese ejercicio).
- **Rutinas iniciales:** un script `seed:starter-routines` crea 4 rutinas iniciales (Full body principiante, Torso, Pierna y glúteo, Cardio y core) con ejercicios del catálogo importado, y las publica.

### R2 — Registro de series rediseñado (Focus Mode)

- **Vista de la sesión:** lista de ejercicios con progreso (2/3 ✓). Al tocar uno se abre.
- **Tabla de series:** `Serie · Anterior · kg · reps · ✓`, prellenada con el valor anterior o el prescrito. Al marcar ✓ se registra y arranca el descanso automático (±15 s, saltar).
- **Récord personal** en vivo cuando se supera el mejor peso o volumen anterior.
- **Resumen al terminar:** duración, series, volumen, récords y "volver a Inicio".
- **Aviso de sesión vieja** (más de 12 h): "¿La terminamos o la descartamos?".
- **Video o imagen compacto,** con las instrucciones plegables.

### R3 — Inicio y Entrenamiento

- **Inicio con "Hoy" como tarjeta principal,** una de estas:
  - continuar la sesión;
  - el entreno que toca (por día de la semana, o el siguiente de la rutina);
  - para el gratis sin rutina, "Elige tu primera rutina".
- **Debajo, en Inicio:** la racha semanal compacta, el progreso y la nutrición resumidos, y la invitación a Pro solo para el gratis.
- **Entrenamiento con pestañas:** **Mi plan** · **Rutinas** (biblioteca) · **Historial**.
- **Español por defecto** (`DEFAULT_LANGUAGE = 'es'`), respetando la preferencia guardada.

### R4 — Pro y bienvenida

- **Bienvenida tras el registro (3 pasos):** confirmar objetivo y nivel → elegir la primera rutina → empezar. Se puede saltar.
- **"Mi plan" rediseñado:**
  - comparativa Gratis vs Pro;
  - pasos SINPE con el número grande y un botón de copiar;
  - una línea de tiempo del pago (reportado → en verificación → activo).
- **Pro en contexto:** en la rutina del gratis, "¿Quieres que un entrenador la ajuste a ti? Pásate a Pro".
- **Para el Pro:** tarjeta "Tu entrenador" con su nombre en Inicio, solo con datos que ya existen.

### R5 — Marca unificada (decisión de Ronny)

- Llevar el acento naranja de la landing a la app del cliente, para que registrarse y entrar se sienta como el mismo producto.
- Toca los tokens compartidos (`styles/index.css`), así que es un PR pequeño y aparte, avisando a Eli.

## 5. Fuera de este rediseño (anotado para después)

- Mensajes con el entrenador.
- Notificaciones push y recordatorios.
- Hábitos.
- Retos y comunidad.
- Integración con relojes.
- Sugerencias de progresión con IA.

## 6. Estado de implementación (2026-10-11)

| Fase | Estado | Notas |
| --- | --- | --- |
| R1 Backend | ✅ Aprobada | Migración `1758240000000`, `seed:starter-routines` (4 rutinas publicadas), E2E 182/182 |
| R2 Modo entrenamiento | ✅ Aprobada | Tabla con "Anterior", ✓ en un toque, descanso ±15 s, récords, resumen y aviso de sesión vieja |
| R3 Inicio y Entrenamiento | ✅ Aprobada | Tarjeta "Hoy", pestañas Mi plan · Rutinas · Historial, español por defecto, biblioteca en Admin |
| R4 Pro y bienvenida | ✅ Aprobada | Bienvenida en 3 pasos, "Mi plan" con comparativa, pasos SINPE y línea de tiempo, Pro en contexto y tarjeta "Tu entrenador" |
| R5 Marca unificada | ✅ Aprobada | Naranja de la landing en la app del cliente (`.client-brand` en `<html>`). Trainer y Admin siguen en azul. Vitest 472/472 y Playwright 114/114 con axe |

### Bugs reales encontrados al probar

- **Inicio de sesiones:** un `LEFT JOIN` bajo `FOR UPDATE` rompía el inicio de cualquier sesión (error 500).
- **Rendimiento anterior:** la consulta no convertía el arreglo de ids a `uuid[]`.
- **Reloj de la sesión:** en sesiones viejas mostraba "52544:59".
- **Barra de descanso:** tapaba la última serie en pantallas de 320 px.
- **Hub de Entrenamiento:**
  - mostraba "Elige tu primera rutina" mientras cargaba;
  - escondía el plan cuando había una sesión abierta;
  - si fallaba iniciar un entrenamiento, no mostraba ningún error.
- **Aviso de sesión vieja:** aparecía en todas las sesiones, aunque fueran recientes.
- **Tarjeta "Hoy":** ignoraba qué entrenamiento tocaba.
- **Bienvenida:** la protección de `/register` mandaba a Inicio antes de llegar a ella.
- **Textos sin traducir:** varios estaban escritos directo en español en los componentes y se pasaron a i18n.

### Para correr los tests

- **La app abre en español, pero los tests corren en inglés:** Vitest con `tests/setup-language.ts` y Playwright con `storageState` en `playwright.config.ts`.
- **Los E2E de Playwright sirven `dist`:** corre `npm run build` antes de `npx playwright test`.
