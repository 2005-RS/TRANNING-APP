# CLAUDE.md

@AGENTS.md

## Reglas del proyecto (leer antes de cambiar código)

- @.cursor/rules/project-orchestrator.mdc
- @.cursor/rules/frontend-standards.mdc
- @.cursor/rules/backend-standards.mdc

Las reglas del proyecto y `docs/frontend/current-task.md` tienen prioridad sobre cualquier skill genérica.

## Skills

Genéricas (en `.claude/skills/`):

- `nestjs-best-practices`: para todo lo que esté en `backend/**`
- `vercel-react-best-practices`: rendimiento de React en `frontend/**` (este es un SPA con Vite, así que ignora las reglas que solo aplican a Next.js/RSC)
- `vercel-composition-patterns`: arquitectura de componentes React
- `frontend-design`: dirección visual para UI nueva

Específicas del proyecto (en `.cursor/skills/`, se leen cuando la tarea lo requiera):
design-system-guardian, motion-interaction-polish, premium-client-ui,
responsive-accessibility-review, trainer-workspace-ui, visual-quality-review.
