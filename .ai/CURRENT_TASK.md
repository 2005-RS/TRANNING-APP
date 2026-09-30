# Current Task

STATUS: APPROVED
<!-- PLANNING -> (PLAN_FAILED) -> READY -> IMPLEMENTING -> REVIEW -> CHANGES_REQUESTED -> APPROVED -->

## Title

Nutrition 2.0 — N1: Nutrient catalog, Food source traceability, Nutrition Engine v1

## Context

- Design source: [`docs/nutrition/nutrition-2.0-reuse-analysis.md`](../docs/nutrition/nutrition-2.0-reuse-analysis.md). Read sections 11, 12, 13 and 25. This task is phase **N1** of section 30. Do not implement later phases (N2+).
- **Closed product decisions D1–D5** are at the top of the design doc. N1 implements the data foundations for:
  - **D1:** no external code is copied;
  - **D3:** the USDA original name is kept immutable next to a verifiable displayName, AI never writes nutrients, and every nutrient value is traceable to its source;
  - **D4:** foods are traceable and deduplicated by `source + externalId`.

  D2 (relative-day templates) and D5 (capabilities) come in later phases.
- Owner: team line B (see [`docs/TEAM-PLAN.md`](../docs/TEAM-PLAN.md)). The nutrition modules are line B files. `frontend/src/generated/**` and the migrations are shared, so keep them in this PR only as needed.
- **License rule:** do not copy code from OpenNutriTracker, Tandoor, kcal, Diet App or llmn. Write everything in our own code. The FDC nutrient IDs are public USDA data and may be used as seed values.

## Goal

Introduce one canonical nutrient catalog and per-food nutrient values, and record where each food comes from. Replace the ad-hoc calc helpers with a pure Nutrition Engine. **Existing API behaviour and existing numbers stay the same.**

## Existing state (verified; do not re-audit)

- **Foods:** `backend/src/modules/nutrition-foods/`. The entity is `nutrition_foods`, with macros per 100 g as fixed decimal columns:
  - `calories_per_100g` (7,2);
  - `protein_g_per_100g`, `carbohydrates_g_per_100g` and `fat_g_per_100g` (6,2);
  - `fiber_g_per_100g` (6,2), which is nullable.

  The response exposes `nutritionPer100g`.
- **Food visibility today:** every ACTIVE food is visible to ADMIN and to all TRAINERs. ARCHIVED foods are visible only to their creator and to ADMIN. Only ADMIN or the creator can write (`nutrition-foods.service.ts`, `requireWritable`). **Keep this exactly.** Visibility and private catalogs are NOT in N1.
- **Plans:** `backend/src/modules/nutrition-plans/`. Items snapshot the food nutrients. The calc helpers are in `nutrition-calc.util.ts` (`roundNutrition`, `scalePer100`, `sumNutrition`, `scaleNullablePer100`) and are used by `nutrition-plans.mapper.ts`.
- **Migrations:** `backend/src/database/migrations/`, timestamp-prefixed. The latest is `1757894400000-…`.

## Scope

### 1. Nutrient catalog (DB + entity + seed)

- **New table `nutrients`:**
  - `id` (uuid);
  - `code` (unique, snake_case, e.g. `energy_kcal`, `protein_g`);
  - `name_en`, `name_es`;
  - `unit` (enum: `kcal`, `g`, `mg`, `ug`);
  - `category` (enum: `ENERGY`, `MACRO`, `FIBER_SUGAR`, `FAT_DETAIL`, `MINERAL`, `VITAMIN`, `OTHER`);
  - `fdc_nutrient_id` (int, nullable, unique when not null);
  - `display_order` (int);
  - `is_core` (bool);
  - timestamps.
- **The migration seeds these rows.** Codes, units and FDC ids:
  - **Core** (`is_core = true`, these map to the existing columns):
    - `energy_kcal` (kcal, 1008);
    - `protein_g` (g, 1003);
    - `carbohydrates_g` (g, 1005);
    - `fat_g` (g, 1004);
    - `fiber_g` (g, 1079).
  - **Non-core:**
    - `sugars_g` (g, 2000);
    - `saturated_fat_g` (g, 1258);
    - `monounsaturated_fat_g` (g, 1292);
    - `polyunsaturated_fat_g` (g, 1293);
    - `cholesterol_mg` (mg, 1253);
    - `sodium_mg` (mg, 1093);
    - `potassium_mg` (mg, 1092);
    - `calcium_mg` (mg, 1087);
    - `iron_mg` (mg, 1089);
    - `magnesium_mg` (mg, 1090);
    - `zinc_mg` (mg, 1095);
    - `vitamin_a_ug` (ug, 1106);
    - `vitamin_c_mg` (mg, 1162);
    - `vitamin_d_ug` (ug, 1114);
    - `vitamin_b12_ug` (ug, 1178);
    - `folate_ug` (ug, 1177).
  - Spanish and English names use normal nutrition terminology.
- The catalog is **read-only** in N1: no create/update endpoints.

### 2. Per-food nutrient values

- **New table `food_nutrients`:**
  - `food_id` (FK → `nutrition_foods`, cascade delete);
  - `nutrient_id` (FK → `nutrients`, restrict);
  - `amount_per_100g` (decimal, **nullable**: `null` means unknown and is not the same as 0);
  - `derivation` (enum `MEASURED` | `CALCULATED` | `ESTIMATED`, default `MEASURED`);
  - `source` (the same enum as the food source: `MANUAL` | `USDA_FDC` | `OPEN_FOOD_FACTS`, not null, default `MANUAL`). **There is deliberately no `AI` value (D3).**
  - `source_nutrient_ref` (varchar, nullable: the external nutrient id, e.g. the FDC nutrient id; null for MANUAL);
  - `updated_by_user_id` (uuid, nullable, FK users);
  - timestamps;
  - PK `(food_id, nutrient_id)`.
- **Backfill** in the same migration: one row per existing food for each core nutrient, taken from the existing columns, with `source = MANUAL`. A NULL fiber value becomes a NULL amount.
- **Keep the existing 5 macro columns** as the fast-path cache. The service must write the core values to **both** places in one transaction on create and update, so they can never diverge.

### 3. Food source traceability and name model (columns on `nutrition_foods`)

- **Source columns (D4):**
  - `source` (enum `MANUAL` | `USDA_FDC` | `OPEN_FOOD_FACTS`, not null, default `MANUAL`);
  - `external_id` (varchar(64), nullable: the FDC id or a barcode);
  - `source_data_type` (varchar, nullable);
  - `source_version` (varchar, nullable);
  - `imported_at` (timestamptz, nullable);
  - `imported_by_user_id` (uuid, nullable, FK users);
  - `density_g_per_ml` (decimal, nullable, > 0 when set).
- **Name columns (D3):**
  - the existing `name` **stays the display name**, with no rename and no behaviour change;
  - `name_original` (varchar(300), nullable): the source's original name, which the API can never change once set;
  - `name_origin` (enum `MANUAL` | `SOURCE` | `AI_GENERATED` | `HUMAN_TRANSLATED`, not null, default `MANUAL`);
  - `name_verified_at` (timestamptz, nullable);
  - `name_verified_by_user_id` (uuid, nullable, FK users).
- **Constraints:**
  - partial unique index on `(source, external_id)` WHERE `external_id IS NOT NULL`;
  - CHECK that `source = 'MANUAL'` OR `external_id IS NOT NULL`;
  - CHECK that `density_g_per_ml IS NULL OR density_g_per_ml > 0`.
- **Backfill:** existing rows get `source = MANUAL`, `name_origin = MANUAL` and `name_original = NULL`.
- In N1 the API **only creates `MANUAL` foods** with `name_origin = MANUAL`. All the source, name-origin and verification fields are **server-controlled** and are not accepted in the create/update DTOs. Importers, AI naming and verification endpoints come in N2 and N9.

### 4. API contract changes (additive only)

- **Food response:** add these fields:
  - `source`, `externalId`, `sourceDataType` and `importedAt`;
  - `nameOriginal`, `nameOrigin`, `nameVerifiedAt` (the existing `name` is the display name);
  - `nutrients: Array<{ code, nameEn, nameEs, unit, category, amountPer100g: number | null, derivation, source }>`, ordered by `display_order` and including only the rows that exist for the food.

  `nutritionPer100g` stays unchanged.
- **Create and update food DTOs:** add an optional `nutrients?: Array<{ code: string; amountPer100g: number | null }>` for **non-core** codes only.
  - Reject unknown codes and core codes (core values keep coming from the existing fields) with 400.
  - Reject duplicate codes with 400.
  - Validate `0 ≤ amount ≤` a sane max per unit, defined as constants next to the existing ones.
  - On update, a provided array **replaces** the non-core set; omitting it leaves the set untouched.
- **New endpoint:** `GET /nutrition/nutrients` (roles ADMIN, TRAINER). Returns the catalog ordered by `display_order`.
- Swagger/OpenAPI decorators follow the existing DTO style. Then run `npm run api:generate` in `frontend/` so the generated client compiles. **Never hand-edit `frontend/src/generated/**`.**
- **Plans API:** no change in N1.

### 5. Nutrition Engine v1 (pure module)

- **New folder `backend/src/modules/nutrition-engine/`** with pure TypeScript only (no Nest or TypeORM imports) and an `index.ts`.
- **Types:**
  - `NutrientCode` (string);
  - `NutrientVector = Record<NutrientCode, number | null>`;
  - `Completeness = { complete: boolean; missing: NutrientCode[] }`.
- **Functions:**
  - `scalePer100(per100: NutrientVector, grams: number): NutrientVector`: per100 × grams / 100, and `null` stays `null`.
  - `sumVectors(vectors: NutrientVector[]): { totals: NutrientVector; completeness: Completeness }`. A code is `null`-contaminated if any input has it `null` while another input has a number. The total sums the known numbers and lists the code in `missing`. If all inputs are `null`, the total is `null`.
  - `roundNutrient(value: number): number`: 2 decimals, same as the current `roundNutrition`.
- **`nutrition-calc.util.ts`:** its functions must delegate to the engine or be replaced by it. `nutrition-plans.mapper.ts` output must be **byte-for-byte identical** for existing data. The existing `nutrition-calc.util.spec.ts` and `nutrition-plans.mapper.spec.ts` must pass unchanged, or be moved without weakening assertions.
- **No rounding inside the engine math.** Round only where the current code already rounds (at the snapshot or response boundary).

### 6. Frontend

- Only what is needed to compile after `api:generate`. No UI changes in N1.

## Out of scope

- Food visibility (GLOBAL/PRIVATE), private catalogs or any change to who sees which food.
- `food_portions`, units other than grams, and density-based conversion logic (the column exists; no logic yet).
- USDA/Open Food Facts integration, caches and API keys (N2, N8).
- Recipes, meal library, plan days, templates, diary, adherence, analytics and substitutions (N3–N7).
- UI to edit micronutrients (a later phase; the API accepts them now).
- Removing or renaming existing columns, endpoints or DTO fields.
- Consolidating the duplicated `numeric.transformer.ts` / `transform.util.ts`. Leave them as they are unless the engine needs one of them.

## Security / authorization

- The roles on the new endpoint and on the food endpoints are unchanged (ADMIN and TRAINER; CLIENT gets 403).
- Server-controlled fields: the DTOs must not accept `source`, `externalId`, `sourceDataType`, `sourceVersion`, `importedAt`, `nameOriginal`, `nameOrigin`, `nameVerifiedAt` or `nameVerifiedByUserId`, nor a per-nutrient `source`, `derivation` or `sourceNutrientRef`. The global `whitelist` / `forbidNonWhitelisted` validation behaviour must reject them. Nutrients written through the API are always `source = MANUAL` and `derivation = MEASURED`.
- **D3 guard:** no code path lets anything other than a user request (or, in later phases, an importer) write `food_nutrients`. Add a unit test that asserts the nutrient source enum has no AI-like value.
- No change to the Client endpoints or to the plan snapshots.

## Restrictions (Codex)

- Follow `AGENTS.md` and `.cursor/rules/backend-standards.mdc`.
- **DB changes only through a new TypeORM migration** (`synchronize: false`). Use one migration with a reversible `down`. Timestamp it after `1757894400000`.
- Keep the existing public behaviour and numbers. Additive changes only.
- No new dependencies.
- Do not run the full test/lint/build suites. You may run the backend nutrition unit specs you touch. General checks belong to `npm run ai:check:*`.
- No commits or pushes.

## Acceptance criteria

1. The migration runs up and down cleanly on a DB that already has foods and plans. After `up`:
   - every existing food has exactly the 5 core `food_nutrients` rows matching its columns, all with `source = MANUAL`;
   - every food has `source = MANUAL` and `name_origin = MANUAL`;
   - inserting two foods with the same `(source, external_id)` fails.
2. `GET /nutrition/nutrients` returns the 21 seeded nutrients in display order. CLIENT gets 403.
3. `GET /nutrition/foods` and `GET /nutrition/foods/:id` include the source fields, the name fields (`nameOriginal`, `nameOrigin`, `nameVerifiedAt`) and `nutrients[]` with a per-value `source`. `name` and `nutritionPer100g` are identical to before.
4. Creating or updating a food with valid non-core `nutrients` persists them. Unknown, core or duplicate codes give 400. Sending `source` or any other server-controlled field is rejected.
5. Core values in the columns and in `food_nutrients` stay equal after create and update. This needs a unit test.
6. The engine has unit tests for `scalePer100` (including `null`), for `sumVectors` (all known, mixed `null`, all `null`) and for `roundNutrient`.
7. The existing nutrition specs and E2E pass without weakened assertions. Plan responses are unchanged.
8. `frontend` compiles against the regenerated client. There are no UI changes.

## Test plan (orchestrator, after implementation)

- `npm run ai:check:fast`, then `ai:review`, then `npm run ai:check:full`.
- Backend: the nutrition unit specs plus `backend/test/nutrition-foods.e2e-spec.ts` and `nutrition-plans.e2e-spec.ts`, extended for the new fields, the 400/403 cases and the `GET /nutrition/nutrients` endpoint.
- Migration: `migration:run` then `migration:revert` then `migration:run` on the local Docker DB with seeded QA data (9 "QA local" foods and the "Plan de volumen QA" plan). Check the backfill counts with SQL.
- Manual: the Client `/client/nutrition` and the Trainer plan editor still show the same numbers as before.

## Implementation notes

- **All product decisions are closed (D1–D5).** For N1 this means:
  - no `visibility`, capabilities, plan days or templates yet;
  - no USDA calls; the FDC API key is only needed in N2.
- Suggested order:
  1. migration and entities;
  2. engine and its tests;
  3. wire the engine into the calc util and mapper, and confirm the existing specs are green;
  4. food service and DTOs;
  5. nutrients endpoint;
  6. E2E updates;
  7. `api:generate`.
