# Current Task

STATUS: APPROVED
<!-- PLANNING -> (PLAN_FAILED) -> READY -> IMPLEMENTING -> REVIEW -> CHANGES_REQUESTED -> APPROVED -->

## Title

F13 Stage 2 — Client Motion and Surface Polish

## Goal

The Client app (`/client/**`) feels finished and consistent: one quiet page entrance per route, a clear surface hierarchy (background < surface < elevated < interactive < selected), and coherent hover / focus-visible / pressed states. It is the same app, not a redesign. Frontend presentation only. No looping motion anywhere in Client.

## Existing state (verified in code; do not re-audit)

- Motion lib is `motion/react`, already installed. Helpers in `frontend/src/shared/lib/motion.ts`: `useReducedMotion`, `MOTION_DURATION_S` (instant .12 / fast .18 / panel .26), `MOTION_EASE`, `motionTransition(token, reduce)`, `revealHidden(reduce)`, `revealVisible`. CSS tokens in `frontend/src/styles/index.css`: `--motion-instant/-fast/-panel` (`--motion-cinematic` is public/login only, never Client). A global `prefers-reduced-motion` rule already lives in `index.css` (~line 154).
- `frontend/src/shared/ui/section-reveal.tsx` (`SectionReveal`) wraps children in a fade+6px rise using those helpers.
- **Double entrance today:** `frontend/src/app/shells/client-app-shell.tsx` already wraps `{children}` in a `motion.div key={pathname}` (fade+6px, hardcoded `0.18` and `[0.16,1,0.3,1]`, not the helpers). On top of that, pages add their own reveals:
  - `SectionReveal`: `client-dashboard/components/dashboard-greeting.tsx`, `primary-training-card.tsx`, and twice in `workout-session/components/training-hub-page.tsx`.
  - Ad-hoc `motion.*` with hardcoded durations (0.2 / 0.24 / 0.28) and inline `y: 6|8`: `client-check-ins/components/check-in-overview-cards.tsx`, `client-check-in-detail-page.tsx` (~L114), `trainer-feedback.tsx`.
  - `workout-focus-page.tsx`: terminal-state `motion.section` (~L223) and `AnimatePresence` swapping `rest-timer` / `set-logger` (~L272-302); `rest-timer.tsx` has a `motion.p`.
- Client surfaces are the `.client-surface-card` class (+ `--flush`) and `dashboard-hero-card` (`--action`, `--calm`) in `index.css` (~L175-230), wrapped by `client-dashboard/components/dashboard-card.tsx` (`DashboardCard tone=default|hero|hero-calm`). Shadow today is a 1px hairline only. `.client-app-shell` / `.client-app-chrome` set the shell/header/bottom-nav backgrounds. `shared/ui/card.tsx` (`Card`, `shadow-sm`) and `button-variants.ts` (`transition-colors` only) are shared with Trainer/Admin.
- Client nav: `features/navigation/client-bottom-nav.tsx` (bottom bar + `ClientMoreSheetList`), `nav-link.tsx`. Client header is inside `client-app-shell.tsx`. Focus Mode is detected by `isClientWorkoutFocusPath` (`navigation/route-meta.ts`); it hides bottom nav / bell / assistant and sets `.client-workout-focus`.
- Nearly every Client feature already uses `client-surface-card`: client-dashboard, workout-session, client-progress, client-nutrition, client-body, client-check-ins, plus `notifications/components/notifications-inbox.tsx`. Changing the shared CSS class therefore also touches Notifications; that is acceptable but must not regress it.

## Scope (may modify)

- `frontend/src/styles/index.css` — Client surface classes only (`.client-surface-card*`, `.dashboard-hero-card*`, `.client-app-*`), plus at most one small shared page-entrance utility. Do not touch `.login-hero-*`, `.hero-enter`, `.trace-field`, boot styles.
- `frontend/src/shared/lib/motion.ts`, `frontend/src/shared/ui/section-reveal.tsx` — only to consolidate onto one entrance pattern.
- `frontend/src/app/shells/client-app-shell.tsx` — presentation/motion only (use the helpers instead of the hardcoded values; keep `key={pathname}` behavior, Focus Mode logic, sheet, assistant).
- `frontend/src/features/navigation/client-bottom-nav.tsx` (and `nav-link.tsx` only if needed) — active/pressed/focus-visible polish.
- Client features, presentation files only (`components/**`): `client-dashboard`, `workout-session`, `client-progress` (`components/**`, `charts/chart-theme.ts` only for token-based color/animation-flag tweaks, no data changes), `client-nutrition`, `client-body`, `client-check-ins`.
- `frontend/src/shared/ui/{card,button-variants}.ts(x)` — only if a change is needed and is verified harmless for Trainer/Admin (prefer Client-scoped classes instead).
- Docs (minimal edits, see Documentation).

## Implementation requirements

### 1. Page entrance: one pattern, one moment per route
- The **shell's `motion.div key={pathname}` is the single page entrance.** Replace its hardcoded numbers with `revealHidden` / `revealVisible` / `motionTransition('fast' or 'panel', reduceMotion)`.
- Remove nested entrance animation on Client pages so nothing animates twice: drop `SectionReveal` from `dashboard-greeting.tsx`, `primary-training-card.tsx`, both places in `training-hub-page.tsx`, and the ad-hoc `motion.section/div` entrances in `check-in-overview-cards.tsx`, `client-check-in-detail-page.tsx`, `trainer-feedback.tsx`. Render plain elements there. Keep `SectionReveal` file only if something outside Client still uses it (grep before deleting; otherwise leave it in place, do not delete).
- Optional: within the shell entrance, header/context then main content may be staggered at most once (≤70ms, two steps, same idea as `.hero-enter`). No per-card cascade. No reveal per card, section, list row or button.
- Content that appears after data loads (skeleton -> content) must not replay a second entrance animation. Use a plain swap.
- Under `prefers-reduced-motion`: no translate, no delay, no entrance transform (`revealHidden` already returns `false`; any CSS keyframe added must be disabled in a `@media (prefers-reduced-motion: reduce)` block).

### 2. Surfaces (tokens only)
- Define the hierarchy in `index.css` with existing tokens (`--background`, `--card`, `--border`, `--primary`, `--foreground`, `--ring`, `--radius-*`, `color-mix(in oklab, …)` as already used). No raw hex, no new palette, no blanket glassmorphism, no heavy shadows.
  - background: `.client-app-shell`; surface: `.client-surface-card`; elevated: hero cards (`dashboard-hero-card--action|--calm`, sheets); interactive: clickable rows/cards; selected/active: primary-tinted border/background.
- Make surface padding, radius, border and gap consistent across Client pages. Fix outliers found while touching files. Do not restructure layouts (dashboard grid in `client-dashboard-page.tsx` stays `lg:grid-cols-12` 7/5).
- Interactive cards/rows (dashboard cards with links, training hub rows, exercise list rows, measurement cards, check-in cards, nutrition meal rows, period selector, rating scale): add a shared hover / active / selected treatment via a small CSS class (e.g. `client-surface-interactive`) using `transition` on `border-color, background-color, box-shadow` with `var(--motion-fast)` / `--motion-instant`. Hover only on `(hover: hover)`; nothing may depend on hover to be usable.
- Every interactive element keeps a visible `:focus-visible` ring (global rule exists, do not override with `outline-none` without an equivalent ring). Pressed state: subtle (opacity/`scale(.98)` at most, `--motion-instant`), disabled stays clearly distinct.

### 3. Per-area guidance
- **Dashboard** (`client-dashboard/components/*`): strengthen hierarchy: greeting -> primary training card (`tone="hero"`, the only strongest surface) -> supporting cards at default tone. Consistent card header/title/metric styles (Geist Mono for numbers via existing pattern). Do not change data, copy (`copy.ts`), formatters or `week-activity` logic. Skeleton (`dashboard-skeleton.tsx`) must keep the same layout as the loaded page to avoid layout shift.
- **Navigation/shell** (`client-app-shell.tsx`, `client-bottom-nav.tsx`): clear active item (weight/colour already varies by `active`; add a token-based indicator, e.g. subtle pill/underline, transition ≤ `--motion-fast`), pressed state, focus-visible, min 44px targets kept, safe-area padding kept, header/bottom-nav backgrounds via existing `.client-app-chrome`. Do not change routes, items (`nav-config.ts`), unread badges, More sheet behavior.
- **Workout / Focus Mode** (`workout-session/components/*`): **calm and distraction-free.** No decorative motion in Focus Mode. Keep only functional transitions: set-logger <-> rest-timer swap (keep `AnimatePresence`, `key`s and `mode`; may use `motionTransition('instant'|'fast')`), terminal-state card static or shell-entrance only. Rest timer must not pulse/loop. Improve surface clarity, large touch targets (`min-h-12` kept), selected/active states and contrast of the current exercise/set. Do not touch `hooks/**`, `lib/**`, timer logic, set payloads, confirm/cancel/finish flow, or `isClientWorkoutFocusPath` behavior. The training hub (`training-hub-page.tsx`) gets normal surface polish.
- **Progress** (`client-progress/components/*`): consistent section surfaces, metric tiles (`metric.tsx`, `personal-best.tsx`), `period-selector.tsx` selected state, list rows (`exercise-list-section`, `exercise-history-list`). Leave `charts/progress-line-chart.tsx` data/props and `lib/**` untouched; chart colors stay via `chart-theme.ts` tokens; do not add chart animations beyond what exists.
- **Nutrition** (`client-nutrition/components/*`): `plan-hero`, `daily-targets`, `plan-totals`, `meal-list`, `food-item` surfaces and macro display consistency. No copy/logic/`lib/**` changes.
- **Body** (`client-body/components/*`): `measurement-card`, `measurements-section`, `photos-section`, `photo-gallery`, `photo-compare`, sheets. Do not touch `private-progress-photo.tsx` logic, signed URL/photo access hooks, upload flow, form schema, or anything that logs/persists URLs. Visual only.
- **Check-ins** (`client-check-ins/components/*`): `check-in-overview-cards`, `check-in-status-badge`, `rating-scale` (selected/focus states), `check-in-form` surfaces, `trainer-feedback`, read-only view. Do not touch `lib/**`, `schemas/**`, payload/mapping/invalidate code, or logging behavior. Never log Check-In text.

### 4. Cross-cutting
- No new dependency, no `canvas`/WebGL/particles, no `infinite` animation or `repeat: Infinity`, no looping/ambient background, no trace-field in Client. Skeleton/spinner shimmer that already exists is fine; add none.
- Prefer CSS transitions/classes over new React state. No extra re-renders for decoration; no `useEffect` for animation.
- Responsive: verify at ~375px, ~768px, ~1280px. No horizontal overflow, no clipped cards, bottom nav never covers content (main keeps its bottom padding), no hover-only affordances.
- Keep existing Spanish/English copy exactly (`copy.ts`, i18n untouched).
- Match the surrounding code: Tailwind utilities + the existing CSS classes; `cn()`; no second styling approach.

## Implementation order (do not jump around)

1. Read `docs/frontend/motion-and-3d.md` (Motion + Accessibility sections only) and `index.css` Client surface block.
2. Entrance pattern: `shared/lib/motion.ts` + `client-app-shell.tsx`; then remove nested reveals (dashboard, training hub, check-ins) so only the shell animates.
3. Surface CSS: hierarchy + `client-surface-interactive` class in `index.css`.
4. Dashboard components.
5. Client shell chrome + `client-bottom-nav.tsx`.
6. Workout: training hub, then Focus Mode (`workout-focus-page`, `exercise-focus`, `set-logger`, `rest-timer`, `confirm-sheet`).
7. Progress.
8. Nutrition.
9. Body.
10. Check-ins.
11. Final pass: grep `client-*` and shell for hardcoded `duration:`/`y: 6|8` leftovers, raw hex, `infinite`; confirm reduced-motion paths.
12. Update docs (below), then write the implementer report and STOP.

## Files likely to change

`frontend/src/styles/index.css`, `frontend/src/shared/lib/motion.ts`, `frontend/src/shared/ui/section-reveal.tsx`, `frontend/src/app/shells/client-app-shell.tsx`, `frontend/src/features/navigation/client-bottom-nav.tsx`, and `components/**` under `frontend/src/features/{client-dashboard,workout-session,client-progress,client-nutrition,client-body,client-check-ins}` (about 45 presentational files; many will need only a class change). Docs: `docs/frontend/current-task.md`, `docs/frontend/frontend-roadmap.md`.

## Files that must NOT change

- `backend/**`, `frontend/src/generated/**`, any API client/query/mutation/hook (`hooks/**`, `lib/**`, `schemas/**`, `query-policy.ts`, `copy.ts` in Client features).
- Auth/session (`features/auth/**` logic, `AuthSessionProvider`, guards, `role-layouts.tsx` logic, `route-meta.ts`, `nav-config.ts`, `routes/**`).
- Trainer/Admin (`features/trainer-*`, `admin*`, `productivity-sidebar.tsx`, their shells) except a shared file when strictly required and harmless.
- Public site/login and trace field (`features/public-site/**`, `login-form.tsx`, `shared/ui/trace-field*`, `ambient-field*`, `.login-hero-*`, `.hero-enter`, `.trace-field`).
- `package.json` / lockfiles, `.env*`, `.cursor/**`, `.ai/**` other than this file, `training-assistant` behavior.

## Out of scope

backend, Trainer, Admin, API, database, migrations, business/auth/session logic, generated client, new dependencies, new features, copy changes, F14 hardening, public/login redesign, trace-field changes (unless a shared visual dependency strictly requires it), Notifications redesign (only incidental effect from shared classes).

## Functional freeze

F02–F12 are frozen. No changes to business logic, auth, refresh/session, guards, roles, requests, queries, mutations, validation, models, contracts, routes, copy or displayed data. Only presentation, motion and surface polish. If a polish idea needs a logic change, skip it and note it in the report.

## Acceptance criteria

1. All in-scope Client screens keep their existing behavior and data.
2. One coherent page-entrance pattern: the shell entrance only, using `motion.ts` helpers / `--motion-*` tokens.
3. No remaining per-section/per-card reveals or `SectionReveal` use inside Client pages; no double entrance on the same route.
4. `prefers-reduced-motion`: no translate/delay/entrance transform; navigation and states still work.
5. No animated looping background or `infinite`/repeat animation in Client.
6. `package.json` and lockfile unchanged.
7. No new raw hex colors in Client code/CSS where a token exists.
8. Focus Mode behavior identical (exercise navigation, set logging, rest timer, finish/cancel, recovery), visually calm, no decorative motion.
9. Auth/session files untouched. 10. `backend/**` untouched. 11. Routes, API, generated, hooks, lib, schemas untouched.
12. Usable at 375 / 768 / 1280 without horizontal overflow; bottom nav does not cover content.
13. hover / focus-visible / active / selected / disabled are consistent across Client cards, rows, nav and controls; keyboard navigation intact.
14. Only the existing design system (tokens, `client-surface-card`, `motion.ts`) is used; no second one.
15. Trainer/Admin look unchanged (any shared-file change is neutral for them).
16. Notifications page still renders correctly with the shared surface changes.
17. Existing specs still pass without being weakened (`shells.spec.tsx`, `sheet.spec.tsx`, `button.spec.tsx`, `rest-timer.spec.tsx`); update a spec only if it asserted removed presentational markup, and say so in the report.

## Documentation (minimal)

- `docs/frontend/current-task.md`: set Status to **F13 Stage 2 IN PROGRESS** (stage 1 done and shown: public site + login); adjust the Stages list marker only. Keep the rest.
- `docs/frontend/frontend-roadmap.md` F13 block: replace `CURRENT / NOT STARTED` with `CURRENT / IN PROGRESS — stage 1 done, stage 2 in progress`. No other edits.

## Validation plan (orchestrator, AFTER implementation; Codex does not run these)

- `npm run ai:check:fast` (lint/typecheck/relevant tests) -> `.ai/CHECKS.md`; frontend build (`ai:check:full` or frontend build only) since CSS/shell/shared UI changed.
- Targeted tests: `shells.spec.tsx`, `rest-timer.spec.tsx`, `sheet.spec.tsx`, `button.spec.tsx`, client-feature specs.
- Manual browser at desktop + mobile: Client Dashboard, Training hub, Workout / Focus Mode (set log -> rest -> next, finish/cancel), Progress (+ exercise detail), Nutrition, Body (measurements + photos), Check-ins (list, detail, form, trainer feedback), Client navigation (bottom nav active state, More sheet, header), Notifications sanity check, one Trainer page sanity check.
- Reduced motion: enable OS/DevTools "prefers-reduced-motion" and confirm no entrance movement and a working Focus Mode.
- Review greps: no `infinite`, no hardcoded `duration:` in Client, no raw hex added, `git diff --stat` shows no backend/generated/package changes.

## Implementer notes

Codex: do not commit or push. Do not run the full check suite; at most one small targeted check for your own change (e.g. the spec of a file you edited). Report with `docs/frontend/task-report-template.md`, then STOP. Do not start stage 3 (Trainer/Admin) or F14.
