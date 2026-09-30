# AGENTS.md

Instructions for any AI coding agent working in this repository (Cursor, Claude Code, Codex, Copilot, etc.).

Cursor loads these automatically from `.cursor/rules/`. Other agents must read them before making changes:

1. [`.cursor/rules/project-orchestrator.mdc`](.cursor/rules/project-orchestrator.mdc) — workflow, roadmap, scope, security, reporting.
2. [`.cursor/rules/frontend-standards.mdc`](.cursor/rules/frontend-standards.mdc) — governs `frontend/**` and `docs/frontend/**`.
3. [`.cursor/rules/backend-standards.mdc`](.cursor/rules/backend-standards.mdc) — governs `backend/**`.

**Team split:** work runs on two parallel lines with file ownership. Read [`docs/TEAM-PLAN.md`](docs/TEAM-PLAN.md) first:
- Line A (Eli): F14, CI, E2E, release and known gaps.
- Line B (Ronny): landing and nutrition.

Do not edit files owned by the other line. Change shared files only in small PRs.

Canonical frontend docs live in [`docs/frontend/`](docs/frontend/) (start with `current-task.md` and `frontend-roadmap.md`). Task-specific skills live in [`.cursor/skills/`](.cursor/skills/).

If documentation and source conflict, source wins.

Non-negotiables (summary; the rules above are authoritative):

- Implement only the current phase in `docs/frontend/current-task.md`. Do not start the next phase.
- Backend is the contract authority: `NestJS → OpenAPI → Orval → frontend/src/generated`. Never hand-edit `frontend/src/generated/**`; regenerate with `npm run api:generate`.
- Never import `backend/src` into the frontend.
- Access token in memory only; refresh via HttpOnly cookie. Never persist tokens in `localStorage`, `sessionStorage`, or IndexedDB.
- Never commit `.env`, credentials, or hardcoded JWTs. Never log tokens, cookies, signed URLs, or Check-In text.
- Database changes only through TypeORM migrations (`synchronize: false`).
- Inspect the existing module/feature before writing code; follow its existing patterns instead of inventing a new one.
- Make small, focused changes. No unrelated refactors, renames, or reformatting of files you didn't need to touch.
- Do not add a new dependency unless the task explicitly needs it and nothing already installed covers it.
- Verify before a task is considered done, and report failures honestly; do not claim success if a check fails. In the Claude + Codex workflow the general lint/test/build checks belong to the `ai:check:*` scripts (the Claude reviewer reads `.ai/CHECKS.md`); implementer/fixer must not duplicate them and may only run one small, targeted check needed for their own change. Outside that workflow, run the relevant lint/test/build checks yourself.
- Do not run `git commit`, `git push`, `git reset --hard`, `git clean`, or any force-push unless a human explicitly asks for that specific action.

## Multi-agent workflow (Claude plans/reviews, Codex implements)

This repo uses a small Claude (architect/reviewer) + Codex (implementer)
loop for day-to-day tasks. It is optional scaffolding, not a replacement for
the rules above. See [`.ai/WORKFLOW.md`](.ai/WORKFLOW.md) for the full loop,
[`.ai/CURRENT_TASK.md`](.ai/CURRENT_TASK.md) for the task currently in
flight, and [`.ai/prompts/`](.ai/prompts/) for the short per-role prompts.
Quick reference: `npm run ai:status`, `ai:plan`, `ai:implement`, `ai:review`,
`ai:fix`, `ai:check:fast`, `ai:check:full` (run from the repo root).
