---
name: visual-quality-review
description: >-
  Run visual QA after a screen or feature is functionally complete. Inspect
  hierarchy, spacing, surfaces, typography, controls, and product feel. Use
  when the user asks for visual review, UI polish, visual hierarchy, spacing
  audit, or whether a screen still looks like a prototype, developer tool,
  component-library demo, generic dashboard, or placeholder. Use when the user
  invokes /visual-quality-review. Do not change business logic unless a real
  UX bug requires it. Do not use as the first skill while implementing API
  wiring or tests.
---

# Visual Quality Review

Run **AFTER** a screen or feature is functionally complete. This is a visual QA skill.

Inspect the **actual implementation** (source + rendered UI when browser/Playwright tools are available). Do not review from a mockup alone.

Do NOT change business logic during visual review unless a real UX bug requires it.

Tokens, roles, and motion authorities:

- `docs/frontend/design-system.md`
- `docs/frontend/role-ux.md`
- `docs/frontend/motion-and-3d.md`

## Review

### Visual hierarchy

- Is the first thing visible the most important?
- Are headings and supporting text clearly differentiated?
- Is anything competing unnecessarily for attention?

### Spacing

- consistent section rhythm
- card padding
- alignment
- mobile breathing room
- excessive unused space

### Surfaces

- background hierarchy
- border contrast
- radius consistency
- elevation consistency
- excessive nested cards

### Typography

- appropriate weights
- readable line height
- numeric hierarchy
- excessive uppercase
- clipping/wrapping problems

### Controls

- button prominence
- input sizing
- active/disabled/loading states
- hover/focus/press feedback

### Product feel

Detect anything that still looks like:

- prototype
- developer tool
- component-library demo
- generic dashboard
- placeholder

## Output

Do not declare visual quality complete without **explicit recommendations**.

Use:

```markdown
## Visual QA

**Screen / route:**
**Role:** CLIENT | TRAINER | ADMIN

### Findings
- [severity] issue — evidence (component/file) — why it hurts hierarchy/feel

### Recommendations
1. Concrete change (token/class/structure), not “make it nicer”

### Pass / fail
- Hierarchy in 2–3 seconds: pass | fail
- Product feel (not prototype/demo/dashboard): pass | fail
- Ready to call visual quality complete: yes | no
```

Severity: blocking (looks unfinished or confuses the job) vs polish (does not block).

If the review is for CLIENT, also apply `premium-client-ui` screen checklist items that are visual. If TRAINER, apply `trainer-workspace-ui` density and Client-context rules.

## Companion skills

Often follow with `motion-interaction-polish` where motion is justified. Pair `design-system-guardian` if findings are token/radius/icon drift.

## Manual invocation

`/visual-quality-review`
