# AGENTS.md

Instructions for any AI coding agent working in this repository (Cursor, Claude Code, Codex, Copilot, etc.).

Cursor loads these automatically from `.cursor/rules/`. Other agents must read them before making changes:

1. [`.cursor/rules/project-orchestrator.mdc`](.cursor/rules/project-orchestrator.mdc) — workflow, roadmap, scope, security, reporting.
2. [`.cursor/rules/frontend-standards.mdc`](.cursor/rules/frontend-standards.mdc) — governs `frontend/**` and `docs/frontend/**`.
3. [`.cursor/rules/backend-standards.mdc`](.cursor/rules/backend-standards.mdc) — governs `backend/**`.

Canonical frontend docs live in [`docs/frontend/`](docs/frontend/) (start with `current-task.md` and `frontend-roadmap.md`). Task-specific skills live in [`.cursor/skills/`](.cursor/skills/).

If documentation and source conflict, source wins.

Non-negotiables (summary; the rules above are authoritative):

- Implement only the current phase in `docs/frontend/current-task.md`. Do not start the next phase.
- Backend is the contract authority: `NestJS → OpenAPI → Orval → frontend/src/generated`. Never hand-edit `frontend/src/generated/**`; regenerate with `npm run api:generate`.
- Never import `backend/src` into the frontend.
- Access token in memory only; refresh via HttpOnly cookie. Never persist tokens in `localStorage`, `sessionStorage`, or IndexedDB.
- Never commit `.env`, credentials, or hardcoded JWTs. Never log tokens, cookies, signed URLs, or Check-In text.
- Database changes only through TypeORM migrations (`synchronize: false`).
