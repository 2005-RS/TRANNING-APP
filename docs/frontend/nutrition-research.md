# Nutrition adaptation — 2026-09-24

User-authorized nutrition improvement on `Eli`; this does not advance F12 or alter the roadmap.

## Research

| Project | Verified activity and license | Fit and tradeoffs |
| --- | --- | --- |
| [wger](https://github.com/wger-project/wger) | 6,963 stars; last push 2026-09-22; AGPL-3.0-or-later; Python/Django | Best functional reference for this training platform: nutrition plans, meals, portions, nutrient totals and explicit goals. Importing the entire application would introduce a second backend and identity model. |
| [kcal](https://github.com/kcal-app/kcal) | 354 stars; last push 2024-05-16; MPL-2.0; PHP | Useful meal organization, recipes, gram-based portions and historical nutrition snapshots. Less recent maintenance and a different stack. |
| [OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker) | 2,576 stars; last push 2026-09-22; GPL-3.0; Dart/Flutter | Strong reference for a mobile diary, food lookup and meal grouping; not a drop-in web coaching workspace. |

Metadata queried from the GitHub repository API. Star counts and push dates are point-in-time observations, not evidence of clinical accuracy, security or production readiness. Repositories were inspected, not deployed or independently audited.

Primary references: [wger nutrition plan model](https://github.com/wger-project/wger/blob/master/wger/nutrition/models/plan.py), [kcal functionality](https://github.com/kcal-app/kcal#functionality), [OpenNutriTracker README](https://github.com/simonoppowa/OpenNutriTracker#readme).

## Decision

Use wger as a functional reference and retain React, NestJS, TypeORM and PostgreSQL. Implement original project-native components; do not copy third-party source, assets or ingredient datasets. No third-party application is added as a runtime dependency. License identifiers are recorded for provenance; no claim is made that these licenses are interchangeable.

The trainer's job is to build a client's prescribed meals, inspect totals against targets, save, and activate the reviewed plan.

## Adaptation scope

- Search and paginate the existing food catalog rather than restricting selection to the first 50 foods.
- Build meals with explicit food selection, decimal gram portions and notes; remove or reorder meals and remove ingredients.
- Keep input identity stable during typing; validate before saving and prevent activation of unsaved edits.
- Display saved calorie, protein, carbohydrate and fat totals against their prescribed targets using backend-provided totals and differences.
- Display saved food names from snapshots, including foods no longer present in an active catalog page.
- Preserve Spanish/English, role authorization, private client data and in-memory tokens.

## Existing contract and boundaries

The backend already supports a food catalog, draft/active/archived plans, atomic meal replacement, nutrient snapshots, totals and target differences. No new API or migration is required for this adaptation.

A consumption diary is a separate data model: dated intake entries owned by clients, snapshotted portions/nutrients, timezone rules, authorized trainer review, migrations, OpenAPI and generated clients. Planned meals must never be presented as consumed calories or adherence. Recipes, barcode lookup, external food imports and automatic dietary prescriptions are not implemented here.

The current database starts without a populated food catalog. Foods entered by an administrator or trainer remain the authoritative source; no invented nutritional data is seeded.
