# Phase report template

Copy this structure for F05–F14 (and any authorized polish that must not advance the roadmap). Individual task prompts may add phase-specific sections; do not omit these.

Replace `FXX` / `FYY` with the current and next phase ids.

---

# Phase Report

## 1. Summary

What shipped and why it is in or out of scope.

## 2. Scope Implemented

Concrete user-facing and technical scope. List what was explicitly not done.

## 3. Backend Contract Used

Generated operations, paths, and DTO fields. State that no invented fields were used.

## 4. Architecture Decisions

Feature folders, shells, lazy routes, shared vs feature UI.

## 5. UX / Visual Decisions

Role (CLIENT / TRAINER / ADMIN), density, tokens, motion restraint.

## 6. Loading / Error / Empty States

How pending, failure, and honest empty data appear.

## 7. Authentication / Authorization Integration

Memory token, cookie refresh, UI guards vs backend authority.

## 8. Query Strategy

Generated hooks, keys, `staleTime` / refetch only if required and justified.

## 9. Mutation Strategy

Which writes, invalidation, and why optimistic updates were or were not used.

## 10. Responsive Design

Viewports verified (CLIENT: 320–430 primary; TRAINER/ADMIN: desktop-first).

## 11. Accessibility

WCAG 2.2 AA intent: labels, focus, contrast, `aria-current`, reduced motion, no color-only status.

## 12. Performance / Code Splitting

Lazy chunks; confirm unused role/feature code was not pulled in.

## 13. Security Review

Token storage, logging, IDOR UI, credentials, signed URLs.

## 14. API Generation

`npm run api:generate` result. Confirm no hand-edits under `src/generated/`.

## 15. Tests

Exact Vitest result (files / tests). Name any skipped unit tests.

## 16. Browser E2E

Exact Playwright result. Justify skips (e.g. missing `E2E_EMAIL` / `E2E_PASSWORD`). Confirm `channel: 'chrome'`.

## 17. Lint

`npm run lint` result.

## 18. Build

`npm run build` result.

## 19. Dependencies Added

Exact packages, or **NONE**.

## 20. Files Created

Exact list.

## 21. Files Modified

Exact list.

## 22. Documentation Updated

Exact list. Did **not** advance roadmap unless the human already accepted a prior phase.

## 23. Backend Gaps

Contract limits discovered. Do not treat gaps as permission to fake data.

## 24. Remaining Risks

Blockers, follow-ups, flaky tests.

## 25. Phase Decision

Return **exactly** one of:

```
FRONTEND FXX VERIFIED — READY FOR FYY
```

or:

```
FRONTEND FXX NOT VERIFIED
```

Then:

```
STOP.
```

Do not start the next phase.
