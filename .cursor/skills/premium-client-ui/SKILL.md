---
name: premium-client-ui
description: >-
  Design and polish CLIENT-facing gym UX: Home, Training, Workout Focus Mode,
  Progress, Nutrition, Body Progress, Check-ins, and Notifications. Use when
  building or reviewing Client screens, mobile-first athlete UI, bottom
  navigation, Focus Mode, gym-friendly touch targets, or Client
  empty/loading/error states. Use when the user invokes /premium-client-ui.
  Do not use for Trainer Workspace, Admin catalogs, or F10 coaching workflows.
---

# Premium Client UI

Specialize in CLIENT-facing product experiences. CLIENT pages should feel closer to **premium training software** and not **database management software**.

Authority (read; do not copy wholesale):

- `.cursor/rules/frontend-standards.mdc`
- `docs/frontend/design-system.md`
- `docs/frontend/role-ux.md` (CLIENT)
- `docs/frontend/engineering-guardrails.md`

Do not invent fitness data, CTAs, or roadmap features. Visual polish must not silently implement F10–F14.

## Direction

Enforce:

- mobile-first design
- premium athletic visual direction
- graphite / near-black layered surfaces
- dark-first while supporting light/system
- strong typographic hierarchy
- Geist Sans for UI
- Geist Mono selectively for numeric values
- generous but controlled spacing
- large gym-friendly touch targets
- clear primary actions
- minimal navigation friction
- strong empty/loading/error states
- restrained gradients
- Lucide icons only
- no generic SaaS dashboard appearance
- no Bootstrap/admin-template feel
- no gaming/neon aesthetic
- no fake fitness metrics
- no random motivational copy

## Screens to review

When the task touches Client product UI, inspect the relevant screens:

| Screen | Primary goal (default) |
| --- | --- |
| Client Home | Start or resume training; see assigned plan, nutrition, check-in, progress without admin chrome |
| Training | Start or resume the current workout |
| Workout Focus Mode | Log sets with previous performance visible; hide bottom nav |
| Progress | Understand completed training, body trends, and exercise history from real data |
| Nutrition | View the assigned meal plan and daily targets (not intake logging) |
| Body Progress | Record measurements and private photos |
| Check-ins | Submit a period check-in; read Trainer feedback when reviewed |
| Notifications | Read the user’s own inbox |

Adjust the primary goal to the actual screen, then apply the checklist below.

## Per-screen checklist

For every Client screen in scope:

1. Identify the single primary user goal.
2. Put the most important action/information first.
3. Remove visual clutter.
4. Check one-handed mobile use.
5. Check loading/error/empty state quality.
6. Check dark and light themes.
7. Check 320 / 375 / 430 / 768 / 1440 widths.
8. Verify bottom-nav/safe-area clearance.
9. Verify no technical/developer wording reaches the user.
10. Verify visual hierarchy in 2–3 seconds.

Focus Mode: bottom nav must stay hidden; exit/minimize must remain reachable; primary set controls stay in the thumb zone.

## Copy and metrics

- Neutral metrics. Do not invent GOOD / BAD / HEALTHY labels.
- Prefer factual empty copy over hype or shame.
- No UUIDs, stack traces, or API path jargon in the UI.
- Empty states: title + one sentence + **one** primary action the CLIENT can actually perform.

## Companion skills

Pair with `design-system-guardian` and `responsive-accessibility-review` on Client UI work. Add `visual-quality-review` and `motion-interaction-polish` only after the screen is functionally complete.

## Manual invocation

`/premium-client-ui`
