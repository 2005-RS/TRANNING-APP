# Plan de equipo — división del trabajo

Actualizado: 2026-09-29

## Estado de partida

- F00–F12 están verificadas.
- F13 (pulido visual) tiene sus tres etapas completas: sitio público y login, Client, y Trainer/Admin. Commits `e4e605b` y `1e1111d`.
- `main` contiene todo. Antes de empezar, cada quien actualiza su rama desde `main`:

```bash
git fetch origin
git checkout <tu-rama>        # Eli: Eli · Ronny: ronny
git merge origin/main         # es fast-forward, no hay conflictos
```

Desde aquí se trabaja en **dos líneas en paralelo**:

| Línea | Responsable | Objetivo |
| --- | --- | --- |
| **A — Terminar el sistema** | Eli (rama `Eli`) | F14: hardening, producción, E2E, CI, bugs pendientes y los huecos conocidos del producto |
| **B — Landing y nutrición** | Ronny (rama `ronny`) | Perfeccionar el sitio público y el login, y el módulo de nutrición completo (Client, Trainer y backend) |

---

## Propiedad de archivos (para no pisarnos)

### Línea B (Ronny): Eli no toca estas rutas

- `frontend/src/features/public-site/**`
- `frontend/src/routes/public-site.tsx`, `frontend/src/routes/login.tsx`
- `frontend/src/features/auth/components/**`, solo lo visual del login. La lógica de sesión es compartida (ver abajo).
- `frontend/src/features/client-nutrition/**`
- `frontend/src/features/nutrition/**`
- Nutrición de Trainer en `frontend/src/features/trainer-workspace/components/`:
  - `trainer-client-nutrition-page.tsx`
  - `trainer-nutrition-plan-detail-page.tsx`
  - `nutrition-meal-editor.tsx`
  - `nutrition-food-search.tsx`
  - `trainer-foods-page.tsx`
- `backend/src/modules/nutrition-foods/**`, `backend/src/modules/nutrition-plans/**`
- `frontend/e2e/public-site.spec.ts`, `frontend/e2e/login.spec.ts`, `frontend/e2e/client-nutrition.spec.ts`
- `docs/frontend/nutrition-research.md`, `docs/frontend/motion-and-3d.md`

### Línea A (Eli): todo lo demás

### Archivos compartidos: avisar antes de tocarlos y hacer PR pequeño

- `frontend/src/styles/index.css`, `frontend/src/shared/**`, `frontend/src/app/**` (router y shells)
- `frontend/src/features/auth/**` (sesión, refresh, guards)
- Archivos de copy e i18n compartidos
- `frontend/src/generated/**`: **nunca a mano**. Si alguien cambia el contrato del backend:
  1. `npm run api:generate`;
  2. se sube en un PR propio;
  3. se avisa al otro.
- Migraciones de TypeORM: una por PR. Revisar que el timestamp no choque con una migración del otro.
- `docs/frontend/current-task.md` y `frontend-roadmap.md`: cada línea actualiza solo su sección.

Si encuentras un problema en un archivo del otro, **no lo arregles**: anótalo en la sección "Reportes cruzados" de abajo, o en un issue.

---

## Línea A — Tareas de Eli (terminar el sistema)

En orden de prioridad. Cada tarea va en un PR a `main` con lint, test y build en verde. Las reglas de `AGENTS.md` y `.cursor/rules/**` siguen aplicando.

### A1. CI en GitHub Actions
- Workflow que corra en cada PR:
  - `lint`, `test` y `build` de backend y frontend;
  - E2E de Playwright, con Postgres y MinIO como servicios.
- Nada entra a `main` con CI en rojo.

### A2. Bug preexistente: miniaturas de ejercicios
- En `/trainer/exercises`, las miniaturas de `ExerciseDemoPlayer` (`features/exercise-demo/`) que no tienen media se quedan con el skeleton `animate-pulse` para siempre (22–36 animaciones activas).
- Deben terminar en el estado vacío o en el de error.

### A3. Accesibilidad (F14)
- Agregar `@axe-core/playwright` a los E2E de las rutas de Client, Trainer, Admin y notificaciones.
- Cero violaciones serias o críticas.
- Pase de teclado completo: sheets, menús, tablas y paginación.
- En las rutas de la línea B, solo **reportar**, no corregir.

### A4. Rendimiento y bundle (F14)
- Revisar el bundle con `vite build` y un visualizador. Eso es una dependencia de desarrollo: justificarla en `docs/frontend/dependency-decisions.md`.
- Confirmar que el code splitting por ruta funciona y que Recharts y Motion no entran al bundle inicial.
- Medir Lighthouse en Client (móvil).

### A5. Manejo de errores y seguridad (F14, continúa `6a19af2`)
- Estados de error consistentes en todas las rutas: 401, 403, 404, 500 y red caída.
- Revisión de seguridad:
  - el token solo en memoria;
  - `safe-log` en todos los lugares que loguean;
  - cabeceras (CSP, HSTS) en la configuración de producción;
  - CORS del backend en producción.

### A6. Producción y release
- `Dockerfile` o configuración de despliegue del frontend.
- Variables de producción documentadas en `docs/frontend/local-environment.md`, o en un doc de despliegue nuevo.
- Checklist de release y reporte final de F14 con `docs/frontend/task-report-template.md`.

### A7. Ampliar los E2E
- Flujos de Trainer: crear plantilla, asignar plan y revisar check-in.
- Flujos de Admin: crear trainer, asignar y desactivar.
- Notificaciones de punta a punta.

### A8. Huecos conocidos del producto (después de A1–A7)
Están listados en `frontend-roadmap.md` → "Known gaps". Cada uno es una tarea aparte. Si toca backend, primero va el contrato: NestJS → OpenAPI → `api:generate`.

1. **Recuperar contraseña**: backend (token por email) y pantallas. *Coordinar con Ronny la parte visual, porque vive junto al login.*
2. **Editor de perfil del Trainer** (`GET/PATCH /trainers/me` ya existe; solo falta el frontend).
3. **Duplicar plantilla de entrenamiento**: endpoint nuevo y botón.
4. **Contador de no leídas en el dashboard de Admin** (`notifications.unreadCount`).

---

## Línea B — Tareas de Ronny (landing y nutrición)

### B1. Landing y login
Perfeccionar `public-site` y el hero del login:
- copy;
- secciones;
- responsive;
- rendimiento del fondo WebGL;
- SEO básico: title, meta y Open Graph.

### B2. Módulo de nutrición
1. **Reintegrar la versión rescatada** que está en `C:\Users\ronny\projects\training-app-rescate\client-nutrition\` (fuera del repo):
   - el tablero de comidas por tipo (`meal-day-board.tsx`);
   - `meal-type-icon.ts`;
   - los helpers `mealsByType` y `plannedOfTargetPercent`, con sus tests.
   - Se compara archivo por archivo; no se copia encima.
2. Pulir la pantalla de nutrición de Client y la gestión de planes del Trainer: editor de comidas y buscador de alimentos.
3. Evaluar con `docs/frontend/nutrition-research.md` si falta algo del contrato de backend. Por ejemplo, un registro de lo que se comió **no existe** hoy: sería backend nuevo y un cambio de contrato.

---

## Reportes cruzados

Anota aquí lo que encuentres en el área del otro: fecha, archivo y problema.

- _(vacío)_
