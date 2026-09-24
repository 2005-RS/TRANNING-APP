# Engineering guardrails

Permanent constraints for `/frontend`. Details live in `.cursor/rules/frontend-standards.mdc` and `docs/frontend/`. This file is the short checklist.

## Generated code

Never manually edit:

```
frontend/src/generated/**
```

Generate through:

```bash
npm run api:generate
```

Prefer generated OpenAPI types over hand-written DTOs.

## Backend

Do not modify `/backend` unless the task explicitly authorizes it.

Never import into frontend:

- `backend/src`
- NestJS DTO source
- TypeORM entities

The backend is the contract authority. Frontend adapts to OpenAPI.

## Auth

- Access token: **memory only**
- Refresh: **HttpOnly cookie**
- `credentials: 'include'`
- Single-flight refresh; retry original request once; no refresh recursion
- Clear TanStack Query cache on logout / user change

Never persist auth tokens in `localStorage`, `sessionStorage`, IndexedDB, or JS-written cookies.

Theme preference **MAY** use `localStorage`. Language preference **MAY** use `localStorage` (`UI_LANGUAGE` only).

Never log tokens, cookies, signed URLs, or Check-In text.

## State

| Kind | Owner |
| --- | --- |
| Server state | TanStack Query (Orval hooks) |
| Route / search | TanStack Router |
| Form state | TanStack Form + Zod (UX only) |
| Local UI | React state |
| Session orchestration | Auth context / memory token module |

No Redux. No Zustand by default.

No scattered `fetch` in feature components. One native-fetch mutator. **No Axios.**

## Types

TypeScript strict. No broad `any`. No `@ts-ignore` to hide architecture issues.

## Security

- No credentials in the repository
- No hardcoded JWTs
- No backend source imports
- UI route guards are UX only; backend authorizes
- IDs are not authorization

## Design

- Existing semantic tokens; dark-first; light and system supported
- Geist Sans for UI; Geist Mono for metrics / timers / numeric values only
- Lucide only
- WCAG 2.2 AA
- `prefers-reduced-motion`
- CLIENT: mobile-first, gym-friendly, large targets, Focus Mode during workouts
- TRAINER / ADMIN: desktop-first productivity, not 3D-decorated admin templates

Avoid neon gaming UI, excessive gradients, and decorative animation everywhere.

## Performance

- Feature/route lazy loading
- Do not load Client, Trainer, and Admin feature code together without need
- Isolate Recharts / Three.js / R3F / Drei / Rive to features that actually need them
- Do not install Rive, Three.js, R3F, Drei, or Spline until the authorizing feature task

## Rejected / deferred

**Rejected by default:** Redux, Zustand, Axios, MUI, Chakra, mixed icon libraries.

**Deferred:** Rive (until F13 and justified), PWA, i18n framework.

**Optional/deferred:** Spline.

## Scope

Do not add chat, payments, AI, email, or push unless a later task authorizes them.

Do not invent frontend data for missing backend fields.

Do not implement the next roadmap phase until asked.
