# Motion and 3D

Motion and 3D are product tools, not decoration. Core training must work if they fail or are disabled.

## Motion (library: Motion)

**Install:** FEATURE-DEPENDENT — F03 for layout transitions is enough; F01 may skip if CSS transitions cover tokens. Prefer installing Motion in F03 when App Shell exists.

### When to use

- Page/layout entrance (opacity + small Y, `--motion-fast`)
- Sheet / dialog / accordion / tabs
- List insert/remove (notifications, set rows)
- Metric number updates
- Workout rest-timer tick (functional, not cinematic)

### When not to use

- Every hover on tables
- Admin bulk pages
- Looping background animation
- Information that exists only in motion

### Durations

| Kind | Time |
| --- | --- |
| Instant feedback (press, toggle) | 100–150ms |
| Common UI | 160–220ms |
| Panels / sheets | 220–300ms |
| Cinematic | not in app chrome; only future marketing/login hero if ever |

### Accessibility (`prefers-reduced-motion: reduce`)

Mandatory:

- No parallax, no auto-rotating 3D, no layout-shift animations
- Opacity-only or instant state changes
- Rest timer and set completion still clearly change state (text/color/icon, not only animation)
- Do not convey “rest complete” solely by a motion flourish

## Rive

**Classification:** DEFERRED until F13 (or the first celebration moment that needs it).

### When to use

Special moments only: workout completed, new PR, Check-In submitted, plan activated, onboarding success.

### When not to use

Buttons, cards, navigation, tables, form chrome.

### Performance

Lazy-load the Rive runtime on the celebration route/modal. Keep files small. Provide a static checkmark fallback.

### Accessibility / fallback

Reduced motion → static illustration or check icon. If the `.riv` fails to load, the success dialog still works.

## Three.js + React Three Fiber + Drei

**Classification:** DEFERRED to F13. F06 inspected the CLIENT contract: no exercise-media or anatomy payload. Progress uses a polished info layout (level 1). Do not install Three.js / R3F / Drei until F13 authorizes it.

### When to use (product value)

- Exercise detail: inspect a **licensed or original** model
- Primary / secondary muscle highlighting from **backend or curated metadata**, not guessed medical claims
- Optional Client workout media alternative when WebGL is healthy and the user opted into 3D

### When not to use

- Admin tables, assignment screens, food catalog, Check-In review queues
- Every dashboard hero
- Login requirement
- Workout logging (sets still work as 2D)

### Interaction concept (not implemented in F00)

```
Exercise Detail
  → media (signed image/video) and/or 3D
  → primary muscles highlighted
  → secondary muscles highlighted
  → instructions + prescription context
```

Hover/tap muscle → highlight. Drag to orbit. Never copy Muscle & Motion meshes or trademarks.

**OpenAPI gap:** CLIENT cannot list `/exercises` or exercise media. Trainer/Admin can. Client workout visualization in V1 is prescription snapshots (name, sets, loads). Do not design F05 to require a Client 3D library API. A later backend task would be needed to expose authorized media to assigned Clients.

### Performance policy

- `React.lazy` + `Suspense` skeleton
- Route-level split; never on the login chunk
- Detect WebGL; if missing → image/video/skeleton
- Mobile: lower DPR, compressed textures, polygon budget (start ≤ 50k triangles per exercise hero unless profiled)
- Pause render when the sheet is hidden
- One viewer instance at a time

### Accessibility / fallback

- Reduced motion: freeze camera; no auto-orbit
- Critical content (exercise name, muscles as text tags, instructions) must exist in HTML beside the canvas
- Keyboard: if 3D is present, provide “reset view”; do not trap focus inside the canvas without an escape

## Spline

**Classification:** OPTIONAL / DEFERRED.

### When to use

Marketing/login artistic hero only, after brand exists.

### When not to use

Workout execution, forms, admin, tables, navigation.

### Performance / a11y / fallback

Treat as a poster image with an optional scene. Reduced motion and low-end devices: still image. Never block login.

## Progressive enhancement summary

| Capability | Enhancement | Baseline |
| --- | --- | --- |
| Motion | Motion library | CSS / instant |
| Celebration | Rive | Icon + text |
| Anatomy | R3F | Signed 2D media + labels |
| Login art | Spline | Gradient + typography |
