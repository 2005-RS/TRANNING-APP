---
name: design-system-guardian
description: >-
  Prevent visual drift by enforcing semantic CSS tokens, Geist Sans and Geist
  Mono, Lucide-only icons, shared surfaces, radius, focus styles, and one
  dark/light/system theme. Use when adding or changing styles, colors,
  shadows, fonts, icons, buttons, inputs, or design tokens; when CLIENT,
  TRAINER, and ADMIN look inconsistent; or when arbitrary hex, random Tailwind
  palette colors, or one-off shadows appear. Use when the user invokes
  /design-system-guardian.
---

# Design System Guardian

Prevent visual drift across the application. Never style a feature as an isolated mini-product. CLIENT, TRAINER and ADMIN must visibly belong to the same platform.

Authority:

- `docs/frontend/design-system.md` (tokens, type, radius, cards, forms, tables)
- `.cursor/rules/frontend-standards.mdc`
- `docs/frontend/engineering-guardrails.md` (Design)

## Reuse

Require reuse of existing:

- semantic colors
- CSS design tokens
- spacing patterns
- typography
- radius
- borders
- focus styles
- surfaces
- icon system
- theme architecture

Components consume tokens, never raw hex in features.

Geist Sans for UI. Geist Mono only for numeric values (load, reps, timers, kcal, bodyweight, rest). Lucide only.

Theme: `dark` | `light` | `system`. Same token names, different values. No feature-specific theme state. Theme preference may use `localStorage`; auth tokens must not.

## Reject

Unnecessary:

- arbitrary hex values
- random Tailwind colors
- one-off shadows
- inconsistent border radius
- mixed icon packs
- unrelated font sizes
- duplicated theme state
- duplicate button/input patterns

Do not pill every card. Do not set the whole UI to mono. Avoid default-everywhere glassmorphism, blur, and neon glow. Optional hairline gradient on **hero** MetricCards only.

Feature-only widgets (`SetRow`, `MealCard`, `CheckInStatusCard`, …) belong in `features/`, not `shared/ui`. Shared UI stays generic primitives.

## New tokens

Before introducing a new token:

1. search existing system
2. determine whether an existing semantic token fits
3. add a new semantic token only when it represents a reusable concept

Prefer `--background`, `--card`, `--border`, `--primary`, `--muted-foreground`, `--danger`, `--radius-*`, `--motion-*`, `--z-*`, `--container-*` over new names that mean the same thing.

Spacing: 4px base; allowed scale in `docs/frontend/design-system.md`. No 13/17/23px except documented hairlines.

## Review output

```markdown
## Token / consistency
- Drift: file + arbitrary value
- Use instead: existing token or primitive
- New token justified?: no | yes (reusable concept)
```

## Companion skills

Use on every Client or Trainer UI task alongside `premium-client-ui` or `trainer-workspace-ui`. Not a substitute for `visual-quality-review`.

## Manual invocation

`/design-system-guardian`
