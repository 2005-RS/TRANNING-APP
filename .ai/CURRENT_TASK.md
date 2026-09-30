# Current Task

STATUS: APPROVED
<!-- PLANNING -> (PLAN_FAILED) -> READY -> IMPLEMENTING -> REVIEW -> CHANGES_REQUESTED -> APPROVED -->

## Title

F13 Stage 3 — Trainer/Admin Visual Polish

## Context

- F13 Stage 1 (public site and login) and Stage 2 (Client motion and surface polish, commit `e4e605b`) are done, validated and pushed. Stage 2 is the quality reference. **Do not modify Client** (`/client/**`, `client-*` features, `.client-*` CSS, `client-app-shell.tsx`, `client-bottom-nav.tsx`).
- This is a restrained productivity polish, not a redesign. Trainer and Admin are dense work tools. Clarity, hierarchy and consistent states matter more than motion.

## Objective

Bring every Trainer and Admin screen to the same level of finish as Client. That means:
- one quiet page entrance coordinated from the shell;
- a consistent surface hierarchy;
- coherent hover, focus-visible, active, selected and disabled states;
- consistent status badges;
- a real mobile strategy for dense tables.

Existing behaviour stays exactly the same.

## Existing state (verified in code; do not re-audit)

### Shell and navigation (shared by Trainer and Admin)
- `app/shells/trainer-app-shell.tsx` and `admin-app-shell.tsx` are thin wrappers around **`app/shells/productivity-shell.tsx`**. It contains:
  - a desktop sidebar (`lg+`, `--sidebar-width`, `bg-card`);
  - `ShellHeader` (`app/shells/shell-header.tsx`, hamburger below `lg`);
  - a mobile left `Sheet` holding `ProductivitySidebarNav`;
  - `<main id="main-content">`;
  - `TrainingAssistant placement="productivity"`.
- **There is no page entrance at all today.** Trainer/Admin do not use `motion/react`, `SectionReveal` or `infinite` anywhere. The only motion is `trainer-templates-page.tsx` (~L200–218): a row colour transition and a chevron nudge, both already token-based and reduced-motion safe.
- Navigation:
  - `features/navigation/productivity-sidebar.tsx`: `NavLink`. Active item is `bg-muted font-medium`; inactive items get `hover:bg-muted`. There is no primary-tinted selected state and no explicit focus-visible styling beyond the global ring.
  - `trainer-workspace/components/client-workspace-nav.tsx`: the client-workspace tabs (`/trainer/clients/$clientId/*`), same pattern, `overflow-x-auto`.
  - Items come from `nav-config.ts` (do not change).

### Surfaces
- Trainer uses the `.workspace-surface` CSS class (`styles/index.css` ~L190: `radius-lg`, border, `bg-card`, `p-4`/`sm:p-5`, **no shadow**) through `WorkspaceSurface` (`trainer-workspace/components/workspace-surface.tsx`, 22 consumers). Notifications also uses `.workspace-surface` for TRAINER/ADMIN (`notifications-inbox.tsx` `surfaceClass(density)`; CLIENT uses `client-surface-card`).
- Admin uses inline Tailwind instead:
  - `AdminSurface` = `rounded-lg border bg-card p-4 shadow-sm sm:p-5`;
  - `AdminTableSurface` = `overflow-x-auto rounded-lg border bg-card shadow-sm`, in `admin-workspace/components/admin-primitives.tsx`.

  → Trainer and Admin surfaces are **inconsistent** (shadow vs no shadow, class vs inline).
- Page layout: `shared/ui/page.tsx` (`PageContainer density='productivity'` default, `PageHeader`, `PageTitle`, `PageIntro`, `ContentSkeleton`). Admin wraps it in `AdminPageScaffold` (with `backLink` and `meta`).

### Duplicated primitives (keep separate; align visuals only)
- `NativeSelect` / `TextArea`: `workspace-surface.tsx` and `admin-primitives.tsx`.
- `PaginationBar`: `trainer-workspace/components/pagination-bar.tsx` and `admin-primitives.tsx`.
- `ConfirmSheet`: `trainer-workspace/components/confirm-sheet.tsx` and `admin-workspace/components/confirm-sheet.tsx`.
- Empty/error/skeleton states:
  - Trainer: `trainer-states.tsx`, `trainer-skeleton.tsx`;
  - Admin: `AdminErrorState`, `AdminEmptyState`, `AdminListEmptyState`, `AdminPageSkeleton`, `AdminListSkeleton` in `admin-primitives.tsx`.

### Status badges (inconsistent)
- `trainer-workspace/components/status-badge.tsx`: ACTIVE/REVIEWED/READY → `default`; SUBMITTED/DRAFT/IN_PROGRESS/PENDING_UPLOAD → `secondary`; everything else → `muted`.
- `AdminStatusBadge` (`admin-primitives.tsx`): ACTIVE/READY → `secondary`; DISABLED/ARCHIVED → `outline`; everything else → `muted`.
- Both wrap the shared `shared/ui/badge.tsx`, which is also used by client-check-ins, notifications and shells.

### Tables (dense lists)
| File | Table min-width | Mobile alternative |
|---|---|---|
| `trainer-clients-page.tsx` | `min-w-[48rem]` | **yes**: `md:hidden` `<ul>` list (~L222). **This is the reference pattern.** |
| `trainer-dashboard-page.tsx` | `min-w-[36rem]` | no (horizontal scroll only) |
| `trainer-foods-page.tsx` | `min-w-[36rem]` | no |
| `admin-trainers-page.tsx`, `admin-clients-page.tsx`, `admin-assignments-page.tsx`, `admin-exercises-page.tsx`, `admin-foods-page.tsx` | inside `AdminTableSurface` | no |

- Admin rows use `<tr className="… hover:bg-muted/40">` even though only the name cell holds a `Link`. The whole row looks clickable but is not. This breaks "hover only on interactive elements".
- Other lists are link rows, for example `trainer-templates-page.tsx` `TemplateRow`: `hover:bg-muted/50 focus-visible:bg-muted/50`, with `outline-none` compensated by a background.

### Sheets
- All Trainer/Admin sheets are `side="right"` with width/background/padding classes only:
  - `confirm-sheet` ×2, `create-template-sheet`, `prescription-sheet`, the `trainer-exercises-page` sheet, `admin-form` `AdminFormSheet`, `assignment-sheet`.
  - None of them repeats the Stage 2 Body bug (a `display` utility on `SheetContent`), so there is nothing to fix there. Do not add `flex`/`grid`/`block` to a `SheetContent` className. If a flex layout is needed, put it on an inner wrapper or use `open:flex`.

### CSS tokens available
- `--motion-instant` 120ms, `--motion-fast` 180ms, `--motion-panel` 260ms (`--motion-cinematic` is public/login only).
- `--sidebar-width`, `--container-wide`, colour tokens, `--radius-*`, `color-mix(in oklab, …)`.
- Global `prefers-reduced-motion` rule (~L154).
- Motion helpers in `shared/lib/motion.ts`: `useReducedMotion`, `motionTransition(token, reduce)`, `revealHidden(reduce)`, `revealVisible`. `client-app-shell.tsx` shows how Stage 2 used them (read it; do not edit it).

## Scope — routes and screens

### Trainer (`routes/trainer/route.tsx`, components in `features/trainer-workspace/components/`)
| Route | Component |
|---|---|
| `/trainer/dashboard` | `trainer-dashboard-page.tsx` (includes a table) |
| `/trainer/clients` | `trainer-clients-page.tsx` (table + mobile list) |
| `/trainer/clients/$clientId` (layout) | `trainer-client-workspace-layout.tsx` + `client-workspace-nav.tsx` (tabs) |
| … `/` overview | `trainer-client-overview-page.tsx` |
| … `/training`, `/training/$planId` | `trainer-client-training-page.tsx`, `trainer-training-plan-detail-page.tsx`, `prescription-sheet.tsx`, `exercise-picker.tsx`, `template-exercise-row.tsx` |
| … `/progress`, `/progress/exercises/$exerciseId` | `trainer-client-progress-page.tsx`, `trainer-exercise-progress-page.tsx` |
| … `/body` | `trainer-client-body-page.tsx`, `trainer-private-photo.tsx` (**visual only**; do not touch signed-URL logic) |
| … `/nutrition`, `/nutrition/$planId` | `trainer-client-nutrition-page.tsx`, `trainer-nutrition-plan-detail-page.tsx`, `nutrition-meal-editor.tsx`, `nutrition-food-search.tsx` |
| … `/check-ins` | `trainer-client-check-ins-page.tsx` |
| `/trainer/check-ins`, `/trainer/check-ins/$checkInId` | `trainer-check-ins-queue-page.tsx`, `trainer-check-in-review-page.tsx` |
| `/trainer/training`, `/trainer/training/$templateId` | `trainer-templates-page.tsx`, `trainer-template-detail-page.tsx`, `create-template-sheet.tsx` |
| `/trainer/nutrition` | `trainer-foods-page.tsx` (includes a table) |
| `/trainer/exercises`, `/trainer/exercises/$exerciseId` | `trainer-exercises-page.tsx`, `trainer-exercise-detail-page.tsx`, `exercise-media-manager.tsx`, `exercise-media-thumb.tsx` |
| `/trainer/notifications` | `notifications/components/notifications-pages.tsx` → `notifications-inbox.tsx` (productivity branch only) |

Shared inside Trainer: `workspace-surface.tsx`, `status-badge.tsx`, `pagination-bar.tsx`, `confirm-sheet.tsx`, `trainer-states.tsx`, `trainer-skeleton.tsx`.

### Admin (`routes/admin/route.tsx`, components in `features/admin-workspace/components/`)
| Route | Component |
|---|---|
| `/admin/dashboard` | `admin-dashboard-page.tsx` |
| `/admin/trainers`, `/admin/trainers/$trainerId` | `admin-trainers-page.tsx` (`AdminTrainersPage`, `AdminTrainerDetailPage`) |
| `/admin/clients`, `/admin/clients/$clientId` | `admin-clients-page.tsx` (list + detail + trainer assignment) |
| `/admin/assignments` | `admin-assignments-page.tsx`, `assignment-sheet.tsx` |
| `/admin/exercises`, `/admin/exercises/$exerciseId` | `admin-exercises-page.tsx` (list + detail + media) |
| `/admin/foods`, `/admin/foods/$foodId` | `admin-foods-page.tsx` |
| `/admin/notifications` | `notifications-inbox.tsx` (productivity branch only) |

Shared inside Admin: `admin-primitives.tsx`, `admin-form.tsx`, `confirm-sheet.tsx`.

**Admin-only features:** trainer management, the global client registry, assignments, and the global exercise/food catalogues. Admin does **not** reuse Trainer workspace components; the two share only the shell, the sidebar, `shared/ui/*` and the notifications inbox. Polish each workspace in its own files and align both through the shared CSS classes described below. Do not merge the duplicated primitives (that is a refactor and out of scope).

## Implementation requirements

### 1. Motion (same philosophy as Stage 2, more restrained)
- Add **one page entrance in `productivity-shell.tsx`**: wrap `{children}` inside `<main>` in a `motion.div key={pathname}`. Use:
  - `initial={revealHidden(reduceMotion)}`;
  - `animate={revealVisible}`;
  - `transition={motionTransition('fast', reduceMotion)}`.

  Follow exactly what `client-app-shell.tsx` does. Read `pathname` with `useRouterState({ select: s => s.location.pathname })`, which `productivity-sidebar.tsx` already uses.
- Key by **pathname only** (not search). Filters, pagination and search params must not replay the entrance.
- Client-workspace tabs (`/trainer/clients/$clientId/*`) change pathname, so they replay the fast fade. That is acceptable. Check that it causes no layout jump and no loss of scroll position that would be worse than today.
- No per-section, per-card, per-row, table or list reveals. No stagger. No `AnimatePresence` added to pages. No `infinite`/repeat. No ambient backgrounds, `canvas`, trace field or `SectionReveal`.
- Hover/press only on real interactive elements. Allowed transitions: `border-color, background-color, box-shadow, color` at `var(--motion-fast)`, and pressed state at `--motion-instant` (opacity, or at most `scale(.98)`; prefer no scale on dense rows). No hardcoded `duration-150`/`200` where a token fits.
- Skeleton → content is a plain swap with no second entrance.
- `prefers-reduced-motion`: no translate and no entrance transform. `revealHidden` already returns `false`. Any CSS added must be neutralised in a `@media (prefers-reduced-motion: reduce)` block.

### 2. Surfaces and states (tokens only, workspace-scoped CSS)
- In `styles/index.css`, **extend the existing `.workspace-surface` block only** (never the `.client-*` classes). Add small workspace-scoped classes:
  - `.workspace-surface`: keep radius/border/padding. Add the same subtle hairline shadow approach as Stage 2, weaker if anything. Tokens and `color-mix` only; no raw hex.
  - `.workspace-surface--flush` (no padding) for tables and lists.
  - `.workspace-interactive`: for clickable rows/cards/links. Transition as above. `(hover: hover)` hover tint. `[aria-current='page']` / `[aria-pressed='true']` / `[aria-selected='true']` primary-tinted selected state. Disabled state clearly distinct. Selected must beat hover (the Stage 2 review MINOR noted hover overriding selected; avoid it here with `:not([aria-current='page'])` or equivalent).
- Change `AdminSurface` and `AdminTableSurface` to use `workspace-surface` / `workspace-surface--flush` (plus `overflow-x-auto` where still needed). Trainer and Admin then share one visual surface. Remove the inline `shadow-sm` there.
- Apply `workspace-interactive` to link rows and clickable cards in Trainer and Admin, for example `TemplateRow`, list rows on the exercises/foods/check-in queues, dashboard links and `md:hidden` mobile list items that are links. Do not apply it to non-interactive containers (lesson from Stage 2: no hover affordance on static `li`/`article`/cards).
- **Admin table rows:** remove `hover:bg-muted/40` from `<tr>`, because the row is not clickable. Keep the name `Link` clearly styled: underline on hover/focus-visible, or the `workspace-interactive` colour treatment on the link itself. Do not make rows clickable; that would be a behaviour change.
- Focus-visible: every interactive element keeps a visible ring. Where a file uses `outline-none` + `focus-visible:bg-*` (e.g. `TemplateRow`), make sure there is still an equivalent visible focus indicator. Prefer removing `outline-none` so the global ring applies.
- Headers: consistent `PageIntro` / `AdminPageScaffold` spacing and title/description styles. Section headings inside surfaces share one style (size, weight, `text-muted-foreground` description). Numbers and metrics use the existing Geist Mono pattern where the Client already does.
- Forms: align `NativeSelect` / `TextArea` in both files with `shared/ui/input.tsx` (height, radius, border, `aria-invalid` treatment and focus ring must look identical in Trainer and Admin). Labels stay visible and associated.

### 3. Navigation
- `productivity-sidebar.tsx`: active item gets a token-based selected state (subtle primary tint plus a `font-medium` foreground, or a thin leading indicator). Inactive items: hover tint only on `(hover: hover)`. Visible focus-visible. Keep `min-h-10`, the unread badge placement and `onNavigate`.
- `client-workspace-nav.tsx`: the same selected/hover/focus language for the tabs. Keep `overflow-x-auto`, `min-w-max` and `aria-current`.
- `shell-header.tsx`: presentation only if needed (border/background consistency with the sidebar). Do not change the hamburger, bell, language or user-menu behaviour.
- The mobile nav `Sheet` in `productivity-shell.tsx` keeps its behaviour.

### 4. Status badges
- Make `StatusBadge` (Trainer) and `AdminStatusBadge` (Admin) use **one consistent visual mapping**:
  - ACTIVE / READY / REVIEWED = positive/primary;
  - DRAFT / SUBMITTED / IN_PROGRESS / PENDING_UPLOAD = attention/secondary;
  - ARCHIVED / DISABLED / CANCELLED = muted/outline.

  Change only the variant mapping inside these two wrappers. Do **not** change `shared/ui/badge.tsx`, the status labels, `statusLabel()` or copy.

### 5. Dense tables: real responsive strategy
- Follow the existing **`trainer-clients-page.tsx` pattern**: the table stays for `md+`, and below `md` an `md:hidden` stacked list shows the same rows. Each item shows the primary field (name, with its link), 2–3 key fields as a label/value pair, the status badge and the same actions.
- Apply it to:
  - `trainer-dashboard-page.tsx`;
  - `trainer-foods-page.tsx`;
  - `admin-trainers-page.tsx`;
  - `admin-clients-page.tsx`;
  - `admin-assignments-page.tsx`;
  - `admin-exercises-page.tsx`;
  - `admin-foods-page.tsx`.
- Hide the table wrapper below `md`, exactly as `trainer-clients-page.tsx` does.
- Render both from the **same row data and handlers**. No new queries, no new state, no duplicated mutation logic.
- Horizontal scroll must never be the only way to reach data at 390px.

### 6. Documentation (minimal; Codex does it)
- `docs/frontend/current-task.md`: Status → `**F13 Stage 3 IN PROGRESS**`. In the Stages list add `← in progress` to stage 3. Nothing else.
- `docs/frontend/frontend-roadmap.md` F13 block: `CURRENT / IN PROGRESS — stages 1–2 done, stage 3 in progress`. Nothing else.

## Implementation order

1. Read `client-app-shell.tsx` (motion reference, read-only), `shared/lib/motion.ts`, and the `.workspace-surface` block in `index.css`.
2. `productivity-shell.tsx` entrance.
3. CSS: `.workspace-surface` shadow, `--flush`, `.workspace-interactive` and the reduced-motion block.
4. `productivity-sidebar.tsx`, `client-workspace-nav.tsx`, `shell-header.tsx` (only if needed).
5. `admin-primitives.tsx` (surfaces, badge, selects, pagination, states) and `status-badge.tsx` / `workspace-surface.tsx` (Trainer).
6. Trainer pages in route order, then Admin pages. Do the responsive tables within those steps.
7. Final grep over `trainer-workspace`, `admin-workspace`, `productivity-*`, `shell-header`:
   - no hardcoded `duration-[0-9]`;
   - no `infinite`;
   - no raw hex;
   - no `hover:` on `tr`/non-interactive containers;
   - no display utility on `SheetContent`.
8. Docs, then the implementer report, then STOP.

## Files likely to change (~35–40)

- **Shell and nav (3–4):**
  - `app/shells/productivity-shell.tsx`
  - `features/navigation/productivity-sidebar.tsx`
  - `features/trainer-workspace/components/client-workspace-nav.tsx`
  - `app/shells/shell-header.tsx` (optional)
- **CSS (1):** `styles/index.css` (workspace block only).
- **Trainer (~18–20):**
  - Primitives: `workspace-surface.tsx`, `status-badge.tsx`, `pagination-bar.tsx`, `trainer-states.tsx`, `trainer-skeleton.tsx`, `confirm-sheet.tsx`.
  - Pages: `trainer-dashboard-page.tsx`, `trainer-clients-page.tsx`, `trainer-client-workspace-layout.tsx`, `trainer-client-overview-page.tsx`, `trainer-client-training-page.tsx`, `trainer-training-plan-detail-page.tsx`, `trainer-client-progress-page.tsx`, `trainer-client-body-page.tsx`, `trainer-client-nutrition-page.tsx`, `trainer-client-check-ins-page.tsx`, `trainer-check-ins-queue-page.tsx`, `trainer-check-in-review-page.tsx`, `trainer-templates-page.tsx`, `trainer-template-detail-page.tsx`, `trainer-foods-page.tsx`, `trainer-exercises-page.tsx`, `trainer-exercise-detail-page.tsx`.
  - Class-only tweaks if needed: `template-exercise-row.tsx`, `nutrition-meal-editor.tsx`, `exercise-picker.tsx`.
- **Admin (~8):**
  - `admin-primitives.tsx`, `admin-form.tsx`;
  - `admin-dashboard-page.tsx`, `admin-trainers-page.tsx`, `admin-clients-page.tsx`, `admin-assignments-page.tsx`, `admin-exercises-page.tsx`, `admin-foods-page.tsx`;
  - `confirm-sheet.tsx` / `assignment-sheet.tsx` only if a class is needed.
- **Tests (0–3):** `trainer-workspace.spec.tsx`, `admin-workspace.spec.tsx` (see Risks).
- **Docs (2):** `docs/frontend/current-task.md`, `docs/frontend/frontend-roadmap.md`.

## Shared primitives (Client risk)

| Primitive | Also used by Client | Rule |
|---|---|---|
| `styles/index.css` | yes | Edit only `.workspace-*` rules and new `.workspace-*` classes. **Do not touch** `.client-*`, `.dashboard-hero-*`, `.login-hero-*`, `.hero-enter`, `.trace-field` or the boot styles. |
| `shared/ui/button.tsx`, `button-variants.ts` | yes (Client, Auth) | **Do not change.** Use `className` at call sites if a Trainer/Admin tweak is needed. |
| `shared/ui/badge.tsx` | yes (client-check-ins, notifications) | Do not change. Change only the wrapper mappings. |
| `shared/ui/sheet.tsx` | yes | Do not change. |
| `shared/ui/page.tsx` | yes (`density='client'`) | Avoid it. If truly needed, change only the `productivity` branch and keep the `client` branch byte-identical. |
| `shared/ui/input.tsx`, `label.tsx`, `skeleton.tsx`, `alert.tsx` | yes | Do not change. Align the Trainer/Admin selects/textareas to them instead. |
| `shared/lib/motion.ts` | yes | Read-only. Use the existing helpers. |
| `app/shells/user-menu.tsx` | yes (Client shell) | Do not change. |
| `features/notifications/components/notifications-inbox.tsx` | yes (CLIENT branch) | Preferably untouched; it gets the `.workspace-surface` CSS change automatically. If edited, touch only the `density === 'productivity'` paths. |
| `training-assistant` | yes | Do not change. |

## Out of scope

- Backend, API, contracts, `frontend/src/generated/**`, database/migrations.
- Hooks, queries, mutations, `lib/**`, `schemas/**`, `copy.ts`/i18n values.
- Routes (`routes/**`), `nav-config.ts`, `route-meta.ts`, roles/guards, `role-layouts.tsx` logic, auth/session.
- New dependencies, `package.json`/lockfile.
- Client UI and the public site/login.
- Merging duplicated Trainer/Admin primitives.
- New features or copy changes.
- F14.
- **Known functional bug, out of scope, report only:** `/trainer/training` lists only ACTIVE templates (`ListWorkoutTemplatesQueryDto` default), so a newly created DRAFT template seems to disappear. Do not fix it in this stage.

## Restrictions (Codex)

- Frontend presentation only. No business logic, permission, role, auth or session changes.
- Keep functional copy unchanged. Keep all `aria-*`, `role`, labels and test IDs.
- Small focused edits. No renames, reformatting or refactors of untouched code.
- Never log tokens, signed URLs or Check-In text. Do not touch `trainer-private-photo.tsx` or `exercise-media-*` logic (classes only).
- Do not break F13 Stage 2: the Client look and behaviour must be unchanged.
- Do not commit, push or run the full check suite. At most one small targeted spec for a file you edited. Report with `docs/frontend/task-report-template.md`, then STOP.

## Risks

1. **Duplicate DOM from the mobile lists.** jsdom ignores CSS, so rendering a row in both the table and the `md:hidden` list makes `getByText`/`getByRole('link')` in `trainer-workspace.spec.tsx` / `admin-workspace.spec.tsx` match twice. Scope the existing assertions with `within(screen.getByRole('table'))` or `getAllBy…`. Never weaken what a test proves, and list every spec change in the report. Check first how the specs already handle `trainer-clients-page.tsx`.
2. **Shell `key={pathname}` remounts the page subtree**, including `trainer-client-workspace-layout.tsx` on tab changes. Local component state such as open sheets or unsaved form input resets on navigation. That is already true when routes change, but confirm that no test or flow relies on state surviving a pathname change within the workspace.
3. **Shared CSS spill:** `.workspace-surface` is also used by the Trainer/Admin notifications inbox. That is intended; check it visually.
4. **Selected versus hover specificity** in `.workspace-interactive` (the Stage 2 MINOR). Selected must win.
5. **Hidden overlays:** Stage 2 found a closed `<dialog>` intercepting clicks because of a `display` class. Do not add display utilities to `SheetContent`. The visual pass must probe that nothing invisible covers the nav or content.
6. **Focus loss:** removing `outline-none` or changing link classes must not remove the visible focus ring.
7. **Badge mapping change** is visual only. Some specs may assert a badge variant or class; update them only if they asserted the old presentational class, and say so.

## Acceptance criteria

1. Every Trainer and Admin route listed above renders the same data and has the same behaviour as before.
2. There is exactly one page entrance per route, from `productivity-shell.tsx`, using the `motion.ts` helpers and tokens. No nested reveals, no stagger, no `infinite`.
3. `prefers-reduced-motion`: no translate, delay or entrance transform. Navigation and sheets still work.
4. Trainer and Admin surfaces share `.workspace-surface` (`--flush`). `AdminSurface` / `AdminTableSurface` no longer use inline `shadow-sm`.
5. Hover and pressed states appear only on interactive elements. Admin `<tr>` rows have no hover. Selected (`aria-current`/`aria-pressed`/`aria-selected`) beats hover.
6. Sidebar and client-workspace tabs have a clear token-based selected state, a hover state on `(hover: hover)` only, and visible focus.
7. `StatusBadge` and `AdminStatusBadge` use the same visual mapping. Labels are unchanged.
8. At 390×844 every dense table listed above has a stacked list alternative. There is no horizontal page overflow and data never needs horizontal scrolling to be reached.
9. At 1440×900 the tables, headers and actions align. Nothing is clipped or overlaps.
10. No raw hex. No hardcoded durations where a `--motion-*` token exists.
11. Keyboard navigation works everywhere: sidebar, tabs, table links, sheets (Escape and focus return) and pagination. Focus is always visible.
12. Contrast: text on surfaces, badges and selected states stays readable in dark and light themes.
13. No invisible element intercepts pointer events (sheets closed, mobile nav closed).
14. Client (`/client/**`) is visually and functionally unchanged. The `.client-*` CSS and the Client shell/nav files are untouched.
15. `backend/**`, `generated/**`, hooks/lib/schemas/routes/nav-config, `package.json` and the lockfile are unchanged.
16. Existing specs pass without being weakened.

## Test plan (orchestrator, after implementation)

- `npm run ai:check:fast`, then `ai:check:full` (CSS, shell and shared UI changed) → `.ai/CHECKS.md`.
- Targeted specs:
  - `features/navigation/shells.spec.tsx`;
  - `features/trainer-workspace/tests/trainer-workspace.spec.tsx`;
  - `features/trainer-workspace/tests/nutrition-editor.spec.tsx`;
  - `features/admin-workspace/tests/admin-workspace.spec.tsx`;
  - `features/notifications/tests/notifications-page.spec.tsx`;
  - `shared/ui/sheet.spec.tsx`;
  - Client regression: `client-body-page.spec.tsx`, `rest-timer.spec.tsx`.
- Review greps:
  - `git diff --stat` shows no backend, generated, package, route or hook changes;
  - no `.client-` diff in `index.css`;
  - no `hover:` on `<tr`;
  - no `infinite`;
  - no display class on `SheetContent`.

## Visual validation plan (Playwright, after checks)

- **Accounts:**
  - Trainer: `qa-trainer@example.test` (local QA user from Stage 2; has 1 client, 2 ACTIVE templates and 1 plan).
  - Admin: the user must supply admin credentials, or approve creating a local QA admin.
- **Desktop 1440×900 and mobile 390×844**, for each Trainer and Admin route above:
  - hierarchy, alignment and surface consistency;
  - table vs. mobile list;
  - no horizontal overflow (`scrollWidth - clientWidth === 0`).
- Motion:
  - one entrance per navigation;
  - none on filter/pagination changes;
  - no running animation after 2s (`document.getAnimations()`).
- Navigation:
  - sidebar selected/hover/focus;
  - mobile hamburger sheet opens and closes (Escape, backdrop, link);
  - client-workspace tabs.
- Interactions:
  - open and close every sheet (create template, prescription, exercise, admin form, assignment, confirm);
  - after closing, hit-test the nav and main content so no hidden layer blocks clicks;
  - pagination;
  - search/filter inputs;
  - status badges.
- Keyboard: Tab through the sidebar, a table with links, and a sheet (Escape and focus return).
- Reduced motion: emulate `prefers-reduced-motion: reduce` and confirm there is no entrance transform.
- Client sanity: `/client/dashboard` and `/client/body` look unchanged at 390×844.
