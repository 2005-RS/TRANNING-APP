---
name: responsive-accessibility-review
description: >-
  Review responsive layout and WCAG 2.2 AA at 320, 375, 430, 768, 1024, and
  1440 widths. Use when checking overflow, clipping, wrapping, bottom
  navigation overlap, sticky controls, mobile keyboard, safe areas, table
  overflow, form reachability, desktop whitespace, labels, focus, keyboard,
  touch targets, reduced motion, or aria-current / aria-invalid. Use when the
  user invokes /responsive-accessibility-review. Do not weaken UI merely to
  satisfy tests — fix the UI correctly.
---

# Responsive + Accessibility Review

Perform responsive + WCAG-oriented UI QA. Do not weaken UI merely to satisfy tests. Fix the UI correctly.

Authority:

- `.cursor/rules/frontend-standards.mdc` (Accessibility)
- `docs/frontend/design-system.md` (breakpoints, touch, tables, forms)
- `docs/frontend/role-ux.md`
- `docs/frontend/engineering-guardrails.md`

## Viewports

Mandatory viewport review:

- 320
- 375
- 430
- 768
- 1024
- 1440

CLIENT primary: 375 / 430. TRAINER / ADMIN primary: 1024 / 1440, with essential paths usable at 768 and via mobile Sheet.

## Check

- horizontal overflow
- clipping
- wrapping
- bottom navigation overlap
- sticky controls
- mobile keyboard interaction
- safe areas
- table overflow
- form reachability
- desktop whitespace

CLIENT: unprefixed mobile styles first; bottom nav + `env(safe-area-inset-*)`; Focus Mode hides bottom nav. TRAINER tables: card-stack or horizontal scroll with sticky first column — never fake-paginate thousands of rows on the client.

Verify overflow with `document.documentElement.scrollWidth - document.documentElement.clientWidth` (Playwright target ≤ 1px) when changing layout.

## Accessibility

- WCAG 2.2 AA intent
- semantic landmarks
- heading hierarchy
- labels
- aria-current
- aria-invalid / describedby
- visible focus
- keyboard use
- touch target size
- no color-only states
- chart text alternatives
- reduced motion
- icon-only button labels

CLIENT workout controls: minimum 44×44 CSS px; prefer 48–56px for weight/reps steppers. Do not rely on hover. Destructive color is not the only error cue (icon + text). Reduced motion still shows rest remaining as text.

Charts: token strokes, tooltip, empty state; no medical color coding; text alternative for the trend.

## Output

```markdown
## Responsive / a11y

| Width | Overflow | Clip/wrap | Nav/safe-area | Notes |
| --- | --- | --- | --- | --- |
| 320 | | | | |
| 375 | | | | |
| 430 | | | | |
| 768 | | | | |
| 1024 | | | | |
| 1440 | | | | |

### A11y findings
- issue — control/route — fix

### Keyboard / focus
- Tab order and focus-visible: pass | fail
```

## Companion skills

Pair with `premium-client-ui` or `trainer-workspace-ui` plus `design-system-guardian`. Not a substitute for `visual-quality-review`.

## Manual invocation

`/responsive-accessibility-review`
