# Review

TASK: F13 Stage 3 — Trainer/Admin Visual Polish
STATUS: APPROVED
FIX CYCLE: 2/2 (re-review of fixes applied after cycle 2)

## Blockers

None. Both earlier blockers are fixed:
- `index.css`: the flush rule is now `.workspace-surface.workspace-surface--flush`, so it beats the `sm+` media padding.
- Frontend tests pass. `.ai/CHECKS.md` is FRESH for the current tree, and `admin-workspace.spec.tsx` scopes row queries to the table with `withinListTable` without weakening the assertions.

## Important

None open. Earlier items:
- Trainer foods mobile "per 100" now uses `formatKcal` · `formatGrams` (fixed).
- The hover shadow and border are now scoped to `.workspace-interactive--card`. Nav items and tabs only get the tint (fixed).
- Admin assignments now uses a separate `md:hidden` `<ul>`. The table keeps its semantics, and the `md:sm:` chain is gone (fixed).
- `NativeSelect`/`TextArea` are aligned: they have `py-2` and the same state order in both primitives files (fixed).
- Section headings are unified to `text-lg font-semibold tracking-tight` in Trainer and Admin (fixed).
- `workspace-interactive` on "exercise / check-in queue rows": no change needed. Those rows use `buttonVariants` links, which already have their own hover, focus and disabled states. The actual link rows (sidebar, tabs, attention list, progress list, templates, client cards, mobile lists) all use `workspace-interactive`.

## Minor

- The Admin foods mobile list shows calories without brand. The table shows brand under the name. Acceptable for a summary row.
- The dashboard mobile list uses the English literals "Workout" and "Sets". This matches the existing hardcoded table headers (pre-existing).
- `trainer-foods-page.tsx`: `<div className="mt-3"><StatusBadge … /></div>` is on one line.

## Pre-existing / Out-of-scope

- `/trainer/training` lists only ACTIVE templates. Not touched.

## Verification

`.ai/CHECKS.md` is FRESH for the current tree:
- Backend lint: PASS
- Backend tests: PASS
- Backend build: PASS
- Frontend lint: PASS
- Frontend tests: PASS
- Frontend build: PASS

The diff greps are clean:
- no `infinite`, no raw hex, no `.client-*` CSS changes;
- no backend, generated, route, hook or package changes;
- no `hover:` on `<tr>`.

The shell entrance uses the `motion.ts` helpers, is keyed by pathname only, and is reduced-motion aware.

## Visual validation (Playwright, 2026-09-29)

Ran with local QA accounts `admin@localhost.dev` and `qa-trainer@example.test`. Their passwords were reset in the local Docker DB only.

- **Routes:**
  - Admin: dashboard, trainers, clients, assignments, exercises, foods.
  - Trainer: dashboard, clients, client overview and its 5 tabs, training, nutrition, exercises, check-ins.
  - All at 1440×900 and 390×844, with 0 horizontal overflow on every route.
- **Tables:** the table shows at desktop and the `md:hidden` list at mobile on Admin trainers, clients, assignments and exercises.
- **No data locally:** Foods has no local data, so the empty state was verified but not the foods mobile list.
- **Motion:**
  - The entrance runs on navigation, and no animation is still running after 2s.
  - The exception is `/trainer/exercises`: 22–36 `animate-pulse` skeletons from `ExerciseDemoPlayer` lazy thumbnails. That component was not touched, so this is PRE_EXISTING.
  - Under `prefers-reduced-motion: reduce` (set at load) there is no transform and opacity is 1. `useReducedMotion` from motion reads the preference once, so toggling it mid-session does not apply until reload. This is library behaviour and matches Client.
- **Sheets:**
  - Admin "New trainer" and Trainer "New template" open and close with Escape.
  - Focus returns to the trigger.
  - After closing, the nav and main pass the hit-test.
- **Keyboard:** Tab reaches the sidebar with a 2px ring outline.
- **Mobile nav:** the hamburger sheet closes with Escape and navigates by link.
- **Client:** `/client/dashboard` and `/client/body` at 390×844 are unchanged.

## Final

Code and visual validation are approved. Stage 3 is marked done in `docs/frontend/current-task.md`. F13 is awaiting external acceptance.

FINAL: APPROVED
