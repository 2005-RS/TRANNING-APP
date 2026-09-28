# Claude + Codex workflow

A small, sequential loop for this repo. Claude plans and reviews; Codex
implements and fixes. Git is the only source of truth for code state — these
files never duplicate a diff or a file tree.

## Roles

| Agent | Role | Touches |
| --- | --- | --- |
| Claude | ARCHITECT, ORCHESTRATOR, REVIEWER | `.ai/CURRENT_TASK.md`, `.ai/REVIEW.md` only |
| Codex | IMPLEMENTER, FIXER | `backend/**`, `frontend/**`, migrations |

Claude is not the default implementer in this workflow. If you ask Claude
directly to write code (as happens in normal Claude Code sessions outside
this loop), that direct request stands — this default only governs the
`ai:*` scripts below.

## The loop

```
you
 │
 ▼
npm run ai:plan -- "<task>"        Claude reads code, writes .ai/CURRENT_TASK.md
 │                                 STATUS: READY?
 ▼
npm run ai:implement               Codex reads AGENTS.md + CURRENT_TASK.md, implements
 │
 ▼
npm run ai:check:fast              lint, scoped to the side(s) that changed
 │
 ▼
npm run ai:review                  Claude reads `git diff` itself, writes .ai/REVIEW.md
 │                                 FINAL: APPROVED?
 ├── no  → npm run ai:fix          Codex fixes BLOCKER/IMPORTANT (max 2 cycles — see below)
 │           │
 │           └──────────────► npm run ai:review (again)
 │
 ▼ yes
npm run ai:check:full              full lint + test + build, both sides
 │
 ▼
you review `git diff` and commit   nothing in this loop commits or pushes
```

`npm run ai:status` is safe to run at any point — it makes no AI calls, just
reads git + `.ai/*.md` and tells you the next command.

## Why no `ai:auto`

There is no single command that chains review → fix → review automatically.
Each step is a separate, human-triggered command on purpose: every Codex run
costs time and tokens, and the point of this loop is that you see the diff
and the review verdict between steps, not that it disappears into a black
box. The 2-cycle cap below is a safety net for the fix step specifically, not
permission to automate the whole loop.

## Fix-cycle cap

`.ai/REVIEW.md` carries a `FIX CYCLE: N/2` line. `ai:fix` increments it and
refuses to run a third time:

```
STOP — .ai/REVIEW.md already recorded 2/2 automatic fix cycles.
Request human review instead of running ai:fix again.
```

At that point, read `.ai/REVIEW.md` and either fix it yourself, hand it back
to Codex manually with more context, or narrow the task. This counter is
reset automatically the next time you run `ai:plan` for a new task.

## Task states

`.ai/CURRENT_TASK.md` `STATUS`: `PLANNING → READY → IMPLEMENTING → REVIEW →
CHANGES_REQUESTED → APPROVED`. Claude sets `PLANNING` vs `READY` in
`ai:plan`; the rest are informational — `ai:review`'s `FINAL` field
(`APPROVED` / `CHANGES_REQUESTED` / `VALIDATION_REQUIRED`) in `.ai/REVIEW.md` is what the scripts
actually branch on.

## Frontend roadmap phases

`docs/frontend/current-task.md` and `docs/frontend/frontend-roadmap.md`
already track which F-phase is active, per
`.cursor/rules/project-orchestrator.mdc` — that system is authoritative for
phase scope and does not move here. When a task **is** a roadmap phase,
`ai:plan`'s prompt tells Claude to read that phase's scope from
`docs/frontend/current-task.md` and copy the relevant bits into
`.ai/CURRENT_TASK.md`, not invent a new scope. `.ai/CURRENT_TASK.md` is the
Claude→Codex handoff for whatever is being worked on right now — a roadmap
phase, a backend feature, a bug fix — it is not a second roadmap.

## Fast check vs. full check

| | Command | Scope | Runs |
| --- | --- | --- | --- |
| Fast | `npm run ai:check:fast` | side(s) with uncommitted changes (`--all` for both) | lint |
| Full | `npm run ai:check:full` | both sides, always | lint + test + build |

Both read the real scripts in `backend/package.json` and
`frontend/package.json` via `npm --prefix <side> run <script>` — nothing is
invented. Neither runs E2E or `api:generate` by default:

- `npm run ai:check:full -- --e2e` also runs `test:e2e` on both sides.
  Backend E2E needs Docker (Postgres/MinIO) already running — see
  `backend/README.md`. Frontend E2E builds its own preview server (slow).
- `npm run ai:check:full -- --api-generate` also regenerates the frontend
  OpenAPI client first. Requires the backend running locally; guarded by
  `frontend/scripts/api-generate.mjs` itself (see
  `docs/frontend/local-environment.md`).

## Security boundaries

What these scripts do **not** do, ever: `git commit`, `git push`,
`git reset --hard`, `git clean -fd`, force-push, install global packages, or
run a destructive migration. Neither `plan.mjs`, `implement.mjs`,
`review.mjs`, nor `fix.mjs` invokes any of those.

The two agents are constrained differently, and it's worth being precise
about which constraint is real code vs. an instruction the agent is trusted
to follow:

- **Claude** (`ai:plan`, `ai:review`) runs with an explicit `--allowedTools`
  allowlist: `Read Glob Grep Write Edit` plus a handful of read-only
  `Bash(git status*|diff*|log*|show*)` patterns (and, for review, the
  project's own lint/test/build commands). Any Bash pattern not on that list
  — including `git commit`, `git push`, `git reset`, `rm` — is refused by
  the CLI itself, not just discouraged by the prompt.
- **Codex** (`ai:implement`, `ai:fix`) runs with
  `--sandbox workspace-write --approve-for-me`: it can read/write files and run arbitrary
  commands, but only inside this repository — no network egress beyond what
  the sandbox permits, no writes outside the working tree. Nothing here
  stops it from running `git commit` *inside* that sandbox if a prompt told
  it to; the real guardrail is that `.ai/prompts/implementer.md` and
  `.ai/prompts/fixer.md` explicitly forbid it, and `implement.mjs` /
  `fix.mjs` record `git rev-parse HEAD` before and after each run, printing
  a loud warning if HEAD moved. That is a tripwire, not a lock.

Neither agent is ever passed `--dangerously-bypass-approvals-and-sandbox`
(Codex) or `--permission-mode bypassPermissions` (Claude). If a task genuinely
needs a destructive action — a real migration revert, a force-push, deleting
data — stop and do it yourself; do not extend these scripts to allow it
without deciding that deliberately.

## Token efficiency

- `.ai/CURRENT_TASK.md` and `.ai/REVIEW.md` are the only handoff state, and
  both stay small — no pasted diffs, no repo trees, no file dumps. Point at
  paths; the next agent reads them itself.
- Every `ai:*` script is a single, bounded agent invocation. Nothing loops
  automatically (see "Why no `ai:auto`" above).
- `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/*.mdc` are the stable
  rulebook and are not re-explained in `.ai/prompts/*.md` — those prompts
  are a few lines that point at the rulebook instead of repeating it.
- `ai:check:fast` is diff-scoped specifically so routine iteration doesn't
  pay for a full test+build cycle on an unrelated side of the repo.

## First-run caveats

These are thin wrappers around real CLIs, not a tested framework — verify on
your first real run:

- Every script accepts `--dry-run` (Claude ones) to print the composed
  invocation without spending anything.
- Exact non-interactive behavior of `claude -p --permission-mode acceptEdits`
  when it hits something outside its `--allowedTools` list (silently denies
  vs. surfaces an error) was not exhaustively tested here — watch the first
  `ai:plan` / `ai:review` run.
- `codex exec --sandbox workspace-write --approve-for-me` (Codex CLI 0.158+;
  `--full-auto` was removed) is the scripted sandboxed mode. A long-running
  implementation task may still take several minutes; that's expected, not a hang.

## Evolution: parallel Codex agents (not implemented yet)

This first version is one Claude + one Codex, sequential, no concurrency, no
worktrees — deliberately, per the brief. A natural next step once this loop
is trusted:

- `git worktree add ../training-app-backend backend-work` and similar for
  frontend/QA, so a Backend Codex, a Frontend Codex, and a QA Codex can run
  in parallel without touching each other's working tree or index.
- Each worktree would need its own `.ai/CURRENT_TASK.md` (or a
  `.ai/tasks/<name>.md` split), since `CURRENT_TASK.md` here assumes one
  task in flight at a time.
- Merge coordination (who reviews the combined diff before it reaches `main`)
  would need its own step — not just "three Codex instances open PRs."

None of this is wired up. Build it only once the sequential version is
proven to be worth the overhead.

## Quick reference

```bash
npm run ai:status                          # read-only, no AI calls
npm run ai:plan -- "add X to Y"            # Claude writes CURRENT_TASK.md
npm run ai:implement                       # Codex implements the approved scope
npm run ai:check:fast                      # lint, changed side(s) only
npm run ai:review                          # Claude writes REVIEW.md
npm run ai:fix                             # Codex fixes findings (max 2x per task)
npm run ai:check:full                      # lint + test + build, both sides
npm run ai:check:full -- --e2e             # + E2E (backend needs Docker up)
npm run ai:check:full -- --api-generate    # + regenerate frontend OpenAPI client
```

Any script also takes `--dry-run` and, for the Claude/Codex ones,
`--model <alias>`.

## Responsibilities (no duplicated work)

- `ai:plan` (Claude) plans, proportional to task size. `ai:implement` / `ai:fix` (Codex) change code
  and run at most one targeted check — no general lint/test/build.
- `ai:check:fast` / `ai:check:full` (scripts) validate and write compact PASS/FAIL lines to
  `.ai/CHECKS.md` (reset by `ai:plan`). `ai:review` (Claude) reads that file instead of re-running.
- `FINAL: VALIDATION_REQUIRED` = nothing to fix; run the named validation, then `ai:review` again.
  Pre-existing/unrelated failures go under "Pre-existing / Out-of-scope" and don't trigger `ai:fix`.
- Reasoning effort: `ai:implement` defaults to `medium`, `ai:fix` to `high` (passed as `-c model_reasoning_effort=<level>`, overriding the global `xhigh` in `~/.codex/config.toml`). Override with `--reasoning medium|high|xhigh`.
