# Current Task

STATUS: READY
<!-- PLANNING -> (PLAN_FAILED) -> READY -> IMPLEMENTING -> REVIEW -> CHANGES_REQUESTED -> APPROVED -->

## Title

F2 — Trainer frontend gaps: edit a template's name and description; edit a training plan's name, description and dates; edit a plan workout's day and notes; edit a nutrition plan's name, dates and daily targets

## Owner authorization (read first)

- **On 2026-10-12, Ronny** (product owner and line B lead) asked to "finish the whole frontend". This task covers the trainer workspace (`features/trainer-workspace/**`).
- **This authorizes an exception** to the line ownership in `docs/TEAM-PLAN.md` and to the F13 boundary in `docs/frontend/current-task.md`, for the files this task lists. Line A (Eli) is notified in `docs/TEAM-PLAN.md`.
- **Do not refuse on ownership or phase grounds.**

## Context

These backend operations exist (generated client; never hand-edit `src/generated/**`) and no screen uses them. Today a trainer cannot fix a typo in a template or plan name, move a workout to another weekday, or adjust a nutrition plan's targets after creation.

| Operation | Body |
| --- | --- |
| `workoutTemplatesUpdate` (`PATCH /workout-templates/:id`) | `UpdateWorkoutTemplateDto { name?, description? }` |
| `trainingPlansUpdate` (`PATCH /clients/:clientId/training-plans/:planId`) | `UpdateTrainingPlanDto { name?, description?, startDate?, endDate? }` |
| `trainingPlansUpdateWorkout` | `UpdateTrainingPlanWorkoutDto { scheduledDay?, notes? }` |
| `nutritionPlansUpdate` | `UpdateNutritionPlanDto { name?, description?, startDate?, endDate?, targetCaloriesKcal?, targetProteinG?, targetCarbohydratesG?, targetFatG? }` |

Check the exact hook names, params, nullable fields and validation limits in `src/generated/**` (models and api files), and the backend DTOs in `backend/src/modules/{workout-templates,training-plans,nutrition-plans}/dto/` (max lengths, date rules, which statuses are editable). Respect the editability rules the backend enforces, e.g. ARCHIVED plans or templates are read-only. Hide the edit buttons then, and map a 409 to safe copy.

## Scope

All edits use a right-side `Sheet` (`@/shared/ui/sheet`), following `features/trainer-workspace/components/prescription-sheet.tsx` and `create-template-sheet.tsx` for structure, validation, pending state and errors.

1. **Template detail** (`trainer-template-detail-page.tsx`): an "Editar" button next to the title opens "Editar plantilla" with name (required) and description (optional, multi-line). Save → PATCH → invalidate the template detail and list queries.
2. **Training plan detail** (`trainer-training-plan-detail-page.tsx`):
   - **"Editar plan"** opens a sheet with name, description, start date and end date.
   - **Validation:**
     - end ≥ start;
     - dates are `YYYY-MM-DD` built from the local date, never `toISOString()`.
   - **Each plan workout** gets a small "Editar" action: a weekday select (with "Sin día" → `null`) and notes (optional).
3. **Nutrition plan detail** (`trainer-nutrition-plan-detail-page.tsx`, plus `trainer-client-nutrition-page.tsx` if the plan header lives there): "Editar plan" opens a sheet with:
   - name, description and dates;
   - daily targets: kcal, protein g, carbs g and fat g, as numbers ≥ 0 with decimals allowed where the DTO allows them.
4. **Errors** go through the existing trainer error mapping (`mapApiError` with safe copy). A 400 shows "Revisa los campos". A 409 shows a not-editable message.
5. **i18n:** every new string goes in `features/trainer-workspace/copy.ts` + `i18n/locales/es/trainer.ts`.

## Out of scope

- Backend changes.
- Reordering, adding or removing workouts (they already exist via other flows).
- An Admin template builder.

## Restrictions (Codex)

- **Formatting:** no line > 120 characters in any touched file. Run `awk 'length > 120' <files>` and paste its empty output.
- **i18n:** never reuse a copy key; no hardcoded strings.
- **Encoding:** after editing Spanish files, grep for `Ã` / `âœ`; it must find nothing.
- **Zod 3 API** only.
- **One `h1` per page** (unchanged).
- **Labels:** every input has a `Label` with `htmlFor`/`id`.
- **Tests:** your sandbox cannot run them. Extend `features/trainer-workspace/tests/trainer-workspace.spec.tsx` using its MSW fixtures (`fixtures.ts`), with `findBy*` + `{ timeout: 10_000 }`.
- **CRLF:** run `npx eslint --fix` on touched files.
- No new dependencies. No commits.

## Tests

- **Template:** edit the name → PATCH body `{ name }` → the new title shows.
- **Training plan:**
  - edit the dates with end < start → a validation error and no request;
  - a valid save PATCHes.
- **Workout:** set the day to Wednesday → PATCH `{ scheduledDay: 'WEDNESDAY' }`; "Sin día" sends `null`.
- **Nutrition plan:** edit the kcal target → PATCH with a numeric value.
- **Archived plan:** no edit buttons.

## Acceptance criteria

1. A trainer can rename and describe templates and plans, change plan dates, move a workout to another day with notes, and adjust nutrition targets, all with validation and safe errors.
2. Archived or non-editable items show no edit actions.
3. Lint, `tsc`, Vitest, build and Playwright pass.
