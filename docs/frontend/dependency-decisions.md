# Dependency decisions

Install nothing in F00. F01 installs only **FOUNDATION** unless noted.

Legend: **FOUNDATION** (F01) · **FEATURE-DEPENDENT** · **DEFERRED** · **OPTIONAL** · **REJECTED**

| Technology | Decision | Why | When installed | Alternatives considered | Risks |
| --- | --- | --- | --- | --- | --- |
| React 19 | FOUNDATION | SPA against a separate REST API; Compiler-ready | F01 | Next.js SSR — poor fit for memory JWT + cookie refresh to another origin | Ecosystem churn |
| Vite | FOUNDATION | Fast DX, first-class SPA, code splitting | F01 | Webpack CRA — obsolete | Config surface |
| TypeScript strict | FOUNDATION | Matches generated OpenAPI types | F01 | Loose TS — rejected | None |
| React Compiler | FOUNDATION | Reduce memo boilerplate on workout lists | F01 (enable in Vite) | Manual memo everywhere | Compiler edge cases — test workout lists |
| Tailwind CSS 4 | FOUNDATION | Token-friendly, utility discipline | F01 | CSS Modules only — slower design system | Utility sprawl — lint + tokens |
| shadcn/ui | FOUNDATION | Copy-in primitives we own | F01 init + few components | MUI / Chakra — wrong aesthetic, heavy | Shipping unused blocks — add per task |
| Base UI | FOUNDATION | Accessible primitives under shadcn | F01 (via shadcn) | Radix-only — shadcn is moving to Base UI; follow current shadcn | Adapter churn |
| CSS variables / tokens | FOUNDATION | Dark/light/brand without rewrites | F01 | Theme JS objects — harder for CSS/Recharts | Incomplete token coverage |
| TanStack Router | FOUNDATION | Type-safe routes, search params for tables, nested layouts | F01 skeleton | React Router 7 — weaker search-param types for this app | Learning curve |
| TanStack Query | FOUNDATION | Server cache, pagination, 115 endpoints | F01 | Redux Toolkit Query — extra store | Cache staleness — use generated keys |
| TanStack Form | FEATURE-DEPENDENT | Complex nested plans; F01 may stub | F02+ (login) / F05–F10 editors | React Hook Form — fine, but TanStack family consistency wins | Younger ecosystem |
| TanStack Table | FEATURE-DEPENDENT | Trainer/Admin lists | F10/F11 (or F03 DataTable shell) | ad-hoc tables — inconsistent | Overkill on Client |
| Zod | FOUNDATION | Env + forms UX | F01 env schema; forms with Form | Valibot — smaller but less Orval overlap | Duplicating backend rules — don’t |
| Orval | FOUNDATION | OpenAPI → fetch + Query hooks | F01 `api:generate` | openapi-typescript + hand hooks — more drift | Docs must stay unique operationIds |
| Native fetch mutator | FOUNDATION | Simplest cookie + Bearer client | F01 | Axios — extra; ky — optional later | Need careful 401 single-flight |
| Recharts | FEATURE-DEPENDENT | 2D trends from real series (body measurements, exercise `trend`) | F06 installed; `React.lazy` into `progress-line-chart` only. Do not force a Rollup `charts` chunk — that absorbed React and loaded Recharts on login / trainer / admin / workout-focus | visx, Chart.js — Recharts + shadcn charts is enough | Bundle size — keep out of login / trainer / admin / workout-focus |
| Motion | FEATURE-DEPENDENT | Layout/sheet | F03 | CSS only — OK for F01 | Over-animation |
| Rive | DEFERRED | Celebrations only | F13 | Lottie — similar; skip until needed | Bundle + a11y |
| Three.js | FEATURE-DEPENDENT | Anatomy/exercise | F06/F13 | None if 2D media suffices | GPU/battery |
| React Three Fiber | FEATURE-DEPENDENT | React integration | with Three.js | Imperative Three — worse in React | Same |
| Drei | FEATURE-DEPENDENT | Helpers (OrbitControls, etc.) | with R3F | Hand-roll — slower | Extra helpers unused |
| Spline | OPTIONAL / DEFERRED | Login art only | After brand, optional | Static image | Heavy runtime |
| Lucide React | FOUNDATION | One icon set | F01 | Mixing FA/Hero/Material — rejected | Import whole pack — tree-shake |
| Sonner | FEATURE-DEPENDENT | Toasts | F02/F03 | shadcn toast — Sonner is specified | Toast overuse |
| date-fns | FOUNDATION | Small date helpers | F01 | Day.js, Temporal — date-fns tree-shakes well | Full locale pack — import functions |
| Vitest | FOUNDATION | Unit tests | F01 | Jest — Vite-native Vitest wins | None |
| Testing Library | FOUNDATION | Component tests | F01 | Enzyme — dead | None |
| Playwright | FEATURE-DEPENDENT | E2E auth/workout | F02 or F14 | Cypress — Playwright is specified | CI browsers |
| MSW | FEATURE-DEPENDENT | Mock OpenAPI in tests | F01 or F02 | Nock — worse for fetch | Stale mocks if not regenerated |
| Redux | REJECTED | No global event bus needed | — | — | Duplicates Query/Router |
| Zustand | REJECTED for F01–F03 | Memory token is a tiny module, not a store library | Reconsider only with proof | Context for token is enough | Extra abstraction |
| Axios | REJECTED | fetch is enough | — | — | Dual HTTP stacks |
| i18next + react-i18next | FOUNDATION | en/es UI copy, live switch, `UI_LANGUAGE` only | Global i18n (post-F10) | Hand ternaries / one JSON blob | Keep namespaces small; no date-fns locale packs |
| PWA / service worker | DEFERRED | Gym offline is product work | not V1 frontend F-series | — | Cache vs signed URLs |

## Overlap rules

- One HTTP client (fetch mutator).
- One server cache (Query).
- One router.
- One form library.
- One icon set.
- No second CSS framework.
