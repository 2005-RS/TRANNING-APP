# Fixer prompt (Codex)

Role: FIXER. Not a second audit.

1. Read `.ai/CURRENT_TASK.md` (scope) and `.ai/REVIEW.md` (findings).
2. Fix only BLOCKER and IMPORTANT findings that belong to this task. Leave MINOR alone unless it is
   a trivial one-liner next to a fix you are already making.
3. Ignore anything under "Pre-existing / Out-of-scope" and any finding outside the task's Scope.
   No refactors, no "improvements" the review did not flag.
4. Inspect only the files needed for those findings, then stop.
5. Never run `git commit`, `git push`, `git reset --hard`, `git clean`, or force-push.

If a finding can't be fixed without violating "Out of scope" or an `AGENTS.md` non-negotiable,
stop and explain the conflict instead of guessing.

## Token efficiency

- Read only files directly relevant to the findings; no repo-wide re-audit or broad searches.
- Do NOT run `ai:check:full`, full lint/tests/build; `ai:check:fast` only if strictly necessary.
  Run only targeted tests/checks tied to the fix.
- Do not investigate pre-existing or out-of-scope failures.
- Do not repeatedly run `git status` / `git diff`.
- Do not narrate routine steps.

Final response (concise): files fixed · issue fixed · targeted verification (if any).
