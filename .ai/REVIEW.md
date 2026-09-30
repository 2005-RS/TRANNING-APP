# Review

TASK: Nutrition 2.0 — N1: Nutrient catalog, Food source traceability, Nutrition Engine v1
STATUS: APPROVED
FIX CYCLE: 1/2

## Blockers

None.

## Important

- ~~E2E not extended~~ — **FIXED.** `backend/test/nutrition-foods.e2e-spec.ts` now covers:
  - the nutrient catalog: ADMIN and TRAINER get 200 with 21 rows ordered; CLIENT gets 403;
  - traceable responses on create, get and list: `source`, `externalId`, `nameOriginal`, `nameOrigin`, per-value `source`, and unchanged `name`/`nutritionPer100g`;
  - 400 for unknown, core, duplicate and over-max codes;
  - 400 for every server-controlled field, including per-nutrient `source`/`derivation`, on both POST and PATCH;
  - non-core replacement and omission;
  - core cache sync on update.
- ~~No unit test for core sync on update~~ — **FIXED** (`updates every core nutrient alongside its cached food column`).
- ~~Generated client not regenerated~~: **RESOLVED by the orchestrator.**
  - `api:generate` could not rename the locked `src/generated` folder (a Windows handle).
  - So Orval was run with the same verified snapshot (`node_modules/.cache/training-api-generate/openapi.json`, which includes the N1 contract) into the pipeline's own staging folder (`src/.generated-staging`), then synced file-by-file into `src/generated`. `diff -rq` confirms the two are identical; the staging folder was removed.
  - The change is purely additive: 4 models changed, 11 new models and the new `nutrition-nutrients` client. No hand edits.
  - Three test fixtures typed as `NutritionFoodResponseDto` got the new required fields with MANUAL values: `admin-workspace/tests/msw-admin.ts` ×2 and `trainer-workspace/tests/fixtures.ts` ×1. The line A file `msw-admin.ts` is test-only and contract-driven; tell Eli.

## Minor (not addressed; allowed to carry into N2)

- `nutrition-engine/index.ts`, `sumVectors`: coerce with `Number(value)` like the old `sumNutrition` did. There is no current bug, because all callers pass numbers.
- `syncCoreNutrients`: an incomplete core catalog should throw `InternalServerErrorException`, not `BadRequestException`.
- `nutrients` in the create and update DTOs: add `@ArrayMaxSize`.
- `list` eager-joins `food_nutrients` for every row: revisit in N2.

## Pre-existing / Out-of-scope

- `.playwright-mcp/` is untracked MCP browser logs. Consider adding it to `.gitignore` (outside this task).

## Verification

`npm run ai:check:full -- --e2e`, run after fix cycle 1:

- backend lint: PASS
- backend tests: PASS (354/354)
- backend build: PASS
- backend test:e2e: PASS (158/158, including the new nutrition cases)
- frontend lint: PASS
- frontend tests: PASS (371/371)
- frontend build: PASS
- frontend test:e2e: PASS (93 passed, 7 skipped)

**Orchestrator checks on the local DB:**

- **Migration round-trip:** `migration:revert` dropped `food_nutrients` and the new columns; `migration:run` re-created everything. Result: 21 nutrients; 9 foods; 45 core rows; 0 foods missing a core row.
- **Numbers unchanged:** `GET /clients/me/nutrition-plans/current` for the QA client returns planned 2,013.9 kcal, a difference of −386.1 kcal, and meals of 582.9, 673, 584.3 and 173.7 kcal. These are identical to the values rendered before N1.

**Frontend after regeneration** (`ai:check:full -- --side frontend --e2e`, 2026-09-30T06:15Z, FRESH):

- frontend lint: PASS
- frontend tests: PASS (371/371)
- frontend build: PASS
- frontend test:e2e: PASS (93 passed, 7 skipped)

The backend is unchanged since its full green run above.

## Final

All acceptance criteria 1–8 are met and verified. The migration round-trip is clean, the plan numbers are unchanged, and the full suites are green on both sides, including E2E. The minor items carry into N2.

FINAL: APPROVED
