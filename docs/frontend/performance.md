# Performance and bundle (F14 · A4)

Baseline measured on 2026-09-30 against commit `7735f7c` plus the A4 changes. Numbers come from a local production build (`vite preview`) against a local API, so absolute times are optimistic compared with a real network. Use them to catch regressions, not as field data.

## Bundle

Run `npm run analyze` in `frontend/`. It is a normal production build plus `dist/bundle-stats.html`, a treemap with gzip sizes (`rollup-plugin-visualizer`, only active in `--mode analyze`).

What the first page load downloads (`dist/index.html`):

| Chunk | Raw | Gzip | Contents |
| --- | --- | --- | --- |
| `index-*.js` (entry) | 466 kB | 140 kB | Router, Query, Zod, i18next and locales, tailwind-merge, Sonner, route definitions |
| `react-vendor-*.js` (modulepreload) | 193 kB | 61 kB | React, React DOM, scheduler |
| `index-*.css` | 70 kB | 13 kB | Tailwind output and tokens |

Confirmed out of the initial bundle:

- **Recharts**: only in `progress-line-chart-*.js` (372 kB, 111 kB gzip), loaded through `React.lazy` by the progress charts.
- **Motion**: in its own async chunk (`react-*.js`, 375 kB, 125 kB gzip: `motion-dom` and `framer-motion`). The app shells, the login page, and Focus Mode import it, so it arrives with the first signed-in or login view, never with the entry.
- **WebGL `TraceField`**: `shared/ui/ambient-field.tsx` imports it with `lazy()`, and it only renders where WebGL is available.
- **socket.io-client / Training Assistant panel**: `training-assistant-panel-*.js` (60 kB), loaded on first open. The entry keeps only the 6.6 kB launcher.

Every route page is its own chunk. `manualChunks` still only pins `react-vendor`; nothing else needed a manual split.

Largest entry costs, in case a later task needs to trim: Zod (130 kB raw, used by the env schema and forms), TanStack Router core (128 kB), tailwind-merge (100 kB), and i18next with both locales (155 kB together).

## Lighthouse, Client on mobile

Lighthouse 12, default mobile profile (Moto G Power emulation, simulated slow 4G, 4× CPU slowdown), headless Chromium. The Client was a fresh account with no plan or history, signed in through the UI. Lighthouse ran with `disableStorageReset` so the HttpOnly refresh cookie survived and every route bootstrapped an authenticated session.

| Route | Performance | Accessibility | Best practices | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/client/dashboard` | 99 | 100 | 100 | 1.5 s | 1.9 s | 10 ms | 0 |
| `/client/training` | 99 | 100 | 100 | 1.5 s | 1.9 s | 0 ms | 0 |
| `/client/progress` | 99 | 100 | 100 | 1.5 s | 1.8 s | 20 ms | 0 |
| `/client/body` | 99 | 100 | 100 | 1.6 s | 2.1 s | 30 ms | 0 |
| `/client/check-ins` | 98 | 100 | 100 | 1.5 s | 2.2 s | 10 ms | 0 |
| `/login` (line B, cold cache) | 87 | 100 | 96 | 2.7 s | 3.5 s | 30 ms | 0 |

The recurring suggestions are small: preconnect to the API origin (about 150 ms) and the render-blocking stylesheet (about 140 ms). With the single-origin deployment recommended for production, the API shares the page origin and the preconnect suggestion no longer applies. `/login` is the first uncached load, so it pays for the entry chunk and fonts; Lighthouse estimates 95 KiB of unused JavaScript there.

## Off-screen skeletons

Progress photos (`client-body/components/private-progress-photo.tsx`, `trainer-workspace/components/trainer-private-photo.tsx`) request their signed URL only when they come within 200 px of the viewport. Before that the query is disabled, and a disabled query still reports `isPending`, so every photo below the fold animated a skeleton indefinitely. That is the same cause as the A2 exercise thumbnails. They now render a still frame, exposed as `role="img"` with the photo label, until the request actually starts.
