# Review

TASK: F13 Stage 2 — Client Motion and Surface Polish
STATUS: APPROVED
FIX CYCLE: 1/2

## Blockers

## Important

## Minor

- The optional bottom-nav "indicator" was not added. The active item only gets the tint and border. This is acceptable.
- `.client-surface-interactive:hover` has higher specificity than the `[aria-current]`/`[aria-pressed]` selected tint, so on desktop the selected item shows the hover tint while hovered. This is cosmetic only.
- `.client-surface-interactive:active { scale(.98) }` applies to nav items and rating buttons. It is subtle and disabled under reduced motion. No action needed.

## Pre-existing / Out-of-scope

- None.

## Verification

- `ai:check:full` (2026-09-28): frontend lint/test/build PASS; backend lint/test/build PASS (no backend changes)
- Visual validation (Playwright, 1440x900 and 390x844): PASS
- Body photo upload sheet fix (pre-existing: closed `<dialog>` kept `display:flex` and blocked the bottom nav): `client-body-page.spec.tsx` 11/11 PASS, Playwright re-check PASS

## Final

The fix cycle resolved both earlier Important items in the diff:
- `period-selector.tsx` no longer uses `client-surface-interactive`, so the selected pill keeps its `bg-primary` colours.
- The class was removed from the non-interactive `measurement-card`, `photo-gallery` pending/failed `li`, training hub `li` and the Focus Mode set rows.

The rating-scale selected state (`bg-primary/15`) matches the CSS tint, so it has no contrast conflict. The shell now uses the `motion.ts` helpers as the single entrance, and the nested reveals are removed. I found no `infinite`, no raw hex and no backend, generated, package or hook changes.

`ai:check:full` passed and the visual validation passed at desktop and mobile.

FINAL: APPROVED
