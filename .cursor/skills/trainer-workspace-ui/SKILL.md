---
name: trainer-workspace-ui
description: >-
  Design and polish TRAINER Workspace UI: dashboard, assigned clients, client
  detail, progress review, body progress review, training-plan and
  workout-template management, nutrition-plan management, check-in review,
  exercises, and notifications. Use when building or reviewing Trainer screens,
  desktop-first coaching software, sidebar navigation, dense tables, search
  and filters, Client switching, or F10 Trainer workflows. Use when the user
  invokes /trainer-workspace-ui. Do not use for Client gym UX, Focus Mode, or
  Admin user-creation catalogs.
---

# Trainer Workspace UI

Specialize in TRAINER-facing workflows. Trainer is NOT simply a larger Client interface.

Ask first: **What does the Trainer need to accomplish in the fewest clear steps?**

Authority (read; do not copy wholesale):

- `.cursor/rules/frontend-standards.mdc`
- `docs/frontend/role-ux.md` (TRAINER)
- `docs/frontend/design-system.md`
- `docs/frontend/frontend-architecture.md` (Trainer complements Client)
- `docs/frontend/engineering-guardrails.md`

Do not implement F10 unless the user explicitly commands that phase. Visual work on Trainer placeholders must not invent OpenAPI-unsupported management.

## Direction

- desktop-first productivity
- professional fitness coaching software
- efficient information density
- clear sidebar/navigation hierarchy
- fast Client switching
- strong search/filter ergonomics
- readable tables/lists where appropriate
- responsive mobile Sheet
- Client context always clear
- actions near the data they affect
- minimal motion
- excellent loading/empty/error states

## F10 surfaces

Prepare (and review, when they exist) for:

- Trainer Dashboard
- Assigned Clients
- Client Detail
- Progress review
- Body progress review
- Training-plan management
- Workout-template management
- Nutrition-plan management
- Check-in review
- Exercises
- Notifications

Phone: dashboard, pending check-ins, client peek. Do not make the plan editor the mobile happy path.

## Workflow checklist

1. State the Trainer job-to-be-done in one sentence.
2. Count the steps to complete it; remove a step if it only exists for layout.
3. Keep the current Client identity visible on every nested Client view.
4. Put primary actions next to the row, plan, or review they affect — not buried in menus.
5. Prefer tables/lists + filters on desktop; card-stack or sticky-first-column scroll on small screens (`docs/frontend/design-system.md` tables).
6. Empty states: explain assignment/admin reality; TRAINER cannot create Clients — no Create Client CTA.
7. Loading: skeleton rows/sections inside the productivity shell, not a full-app spinner.
8. Check `lg` first, then `md`/`sm` essential paths via the Trainer mobile Sheet.

## Avoid

- giant mobile fitness controls on desktop
- generic admin template
- excessive cards
- decorative dashboards
- hiding essential actions inside menus
- visually confusing one Client with another
- cloning Client Focus Mode, large steppers, or athlete-chart chrome as the Trainer happy path
- neon, 3D decoration, or cinematic motion on queues and tables

## Companion skills

Pair with `design-system-guardian` and `responsive-accessibility-review`. Add `visual-quality-review` after the workspace screen is functionally complete. Use `motion-interaction-polish` sparingly (sheets, row expand, confirm) — not dashboard decoration.

## Manual invocation

`/trainer-workspace-ui`
