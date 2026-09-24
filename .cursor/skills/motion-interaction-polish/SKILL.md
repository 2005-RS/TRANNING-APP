---
name: motion-interaction-polish
description: >-
  Add restrained premium interaction quality with Motion: state change,
  navigation, hierarchy, confirmation, and focus. Use when polishing button
  press, active navigation, drawer or sheet transitions, page or section
  reveal, set completion, workout completion, or error/success transitions.
  Use when animation feels decorative, too long, looping, or ignores
  prefers-reduced-motion. Use when the user invokes /motion-interaction-polish.
  Do not use for Admin decorative dashboards or to delay interaction.
---

# Motion + Interaction Polish

Add restrained premium interaction quality.

Motion philosophy:

Motion communicates:

- state change
- navigation
- hierarchy
- confirmation
- focus

It must NOT exist purely as decoration.

Authority:

- `docs/frontend/motion-and-3d.md`
- `docs/frontend/design-system.md` (Motion tokens)
- `.cursor/rules/frontend-standards.mdc`

Rive / Three / Spline stay deferred until an authorizing feature task. Do not install them from this skill.

## Timing

| Duration | Use |
| --- | --- |
| 100–150ms (`--motion-instant`) | immediate feedback |
| 160–220ms (`--motion-fast`) | common transitions |
| 220–300ms (`--motion-panel`) | larger panel transitions |

Avoid:

>500ms routine UI animations.

Easing: standard decelerate. Never make interaction wait for animation.

## Good uses

- button press
- active navigation indicator
- drawer/sheet transitions
- page/section reveal
- set completion
- workout completion
- error/success state transition

## Bad uses

- endless floating elements
- constant pulsing
- excessive parallax
- animated admin dashboards
- repeated bouncing icons
- every hover on tables
- looping background animation
- information that exists only in motion

## Reduced motion

Always respect:

`prefers-reduced-motion`

When reduce is set: no parallax, no auto-rotating 3D, no layout-shift animations. Opacity-only or instant state changes. Rest timer and set completion still change state with text/color/icon, not only animation. Do not convey “rest complete” solely by a motion flourish.

## Role density

CLIENT: short feedback on set complete and rest timer. TRAINER: minimal motion (sheets, confirm). ADMIN: motion forbidden as decoration.

## Output

```markdown
## Motion
- Keep / add: trigger — duration token — what it communicates
- Remove: decorative or >500ms / looping motion
- Reduced-motion fallback: described
- Interaction blocked by animation?: no | yes (fix)
```

## Companion skills

Use after `visual-quality-review` when polish is requested. Do not load this skill for every layout tweak.

## Manual invocation

`/motion-interaction-polish`
