# CLAUDE.md

@AGENTS.md

## Reglas del proyecto (leer antes de cambiar código)

- @.cursor/rules/project-orchestrator.mdc
- @.cursor/rules/frontend-standards.mdc
- @.cursor/rules/backend-standards.mdc

Las reglas del proyecto y `docs/frontend/current-task.md` tienen prioridad sobre cualquier skill genérica.

## Rol en este repo (flujo Claude + Codex)

Ver [`.ai/WORKFLOW.md`](.ai/WORKFLOW.md) para el flujo completo. Por defecto
en ese flujo, Claude es ARCHITECT, ORCHESTRATOR y REVIEWER, no
IMPLEMENTER: planifica en [`.ai/CURRENT_TASK.md`](.ai/CURRENT_TASK.md) y
revisa en [`.ai/REVIEW.md`](.ai/REVIEW.md); Codex implementa y corrige. Esto
es una preferencia de flujo, no una restricción absoluta — si el usuario
pide directamente que Claude implemente algo, esa petición aplica igual que
siempre.

Al planificar (`.ai/prompts/architect.md`): inspeccionar solo el código
relacionado con la tarea, identificar módulos afectados, cambios de base de
datos, impacto en seguridad/autorización y en el contrato de API, plan de
pruebas y criterios de aceptación, y escribir únicamente
`.ai/CURRENT_TASK.md` (sin volcar diffs ni árboles de archivos).

Al revisar (`.ai/prompts/reviewer.md`): leer `git diff` directamente (no
pedir que se lo peguen), revisar contra `.cursor/rules/backend-standards.mdc`
/ `frontend-standards.mdc` según corresponda, y escribir el veredicto en
`.ai/REVIEW.md` clasificando hallazgos como BLOCKER / IMPORTANT / MINOR.
El reviewer NO ejecuta tests/lint/build ni `ai:check:full` automáticamente:
consume `.ai/CHECKS.md` (FRESH / STALE / MISSING; solo FRESH cuenta como
evidencia) y devuelve `VALIDATION_REQUIRED` si falta una validación, sin
exigir `check:full` cuando la tarea no lo necesita. Fallos preexistentes o
fuera de alcance se reportan como PRE_EXISTING / OUT_OF_SCOPE y no se
arreglan. `FINAL: APPROVED` solo si no hay BLOCKER ni IMPORTANT y hay
evidencia suficiente.

## Skills

Genéricas (en `.claude/skills/`):

- `nestjs-best-practices`: para todo lo que esté en `backend/**`
- `vercel-react-best-practices`: rendimiento de React en `frontend/**` (este es un SPA con Vite, así que ignora las reglas que solo aplican a Next.js/RSC)
- `vercel-composition-patterns`: arquitectura de componentes React
- `frontend-design`: dirección visual para UI nueva

Específicas del proyecto (en `.cursor/skills/`, se leen cuando la tarea lo requiera):
design-system-guardian, motion-interaction-polish, premium-client-ui,
responsive-accessibility-review, trainer-workspace-ui, visual-quality-review.
