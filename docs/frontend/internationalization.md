# Internationalization (English / Spanish)

Supported UI languages: **English (`en`)** and **Spanish (`es`)**. Default is English. This is a frontend-only presentation layer. It does not change the API, OpenAPI client, route URLs, or roadmap phase.

## Architecture

- Libraries: `i18next` + `react-i18next`
- Bootstrap: `frontend/src/i18n/index.ts`
- Live copy: feature `*Copy` objects are proxies over the active resource bundle (`createLiveCopy`)
- React subscription: `LanguageProvider` re-renders the tree on `languageChanged`
- Namespaces live in feature `*CopySource` objects (English) and `frontend/src/i18n/locales/es/` (Spanish)

Do not add `language === 'es' ? … : …` ternaries.

## Preference

Persisted in `localStorage` under `UI_LANGUAGE` only. Never store tokens or session data there.

On bootstrap:

1. Read `UI_LANGUAGE`
2. Use it if it is `en` or `es`
3. Otherwise English

An explicit choice is not overwritten by the browser locale on later visits. Unknown values fall back to English.

Theme preference (`training-platform-theme`) is independent.

## HTML language

`document.documentElement.lang` is `en` or `es`. `index.html` applies a saved value before paint.

## Language switcher

Globe control (Lucide), labels **English** / **Español**, codes EN / ES. No country flags.

| Surface | Placement |
| --- | --- |
| Login | Header, next to appearance |
| Client | Compact header control; also in More |
| Trainer / Admin desktop | Header, next to appearance |
| Trainer / Admin mobile | Compact header control; also in the account menu |

Switching language does not reload, log out, change the route, or refetch because of language. Language is not part of TanStack Query keys.

## Adding keys

1. Add the English string to the feature `*CopySource` object.
2. Add the same key to the matching file under `frontend/src/i18n/locales/es/`.
3. Read it through the live `*Copy` export in UI code.
4. Prefer Latin American Spanish (Costa Rica–neutral). Product terms: Workout → Entrenamiento, Check-in → Seguimiento, Trainer → Entrenador, Client → Cliente.

## Dates and numbers

Use `frontend/src/i18n/format.ts` (`Intl` with `en-US` / `es-CR`). Do not import date-fns locale packs. Numeric API payloads stay numbers; localization is display-only. Unit symbols `kg`, `cm`, `%`, `kcal`, `g` stay as symbols.

## What must not be translated

- Client / Trainer names
- User-entered template, plan, meal, and exercise **names** from the API
- Trainer notes, check-in answers, check-in feedback
- Route paths (`/client/training`, `/trainer/clients`, …)
- Backend enum **values** sent or received (`DRAFT`, `ACTIVE`, `SUBMITTED`, …)

## Enum mapping

Map enums only when rendering:

| API | English | Spanish |
| --- | --- | --- |
| `DRAFT` | Draft | Borrador |
| `ACTIVE` | Active | Activo |
| `ARCHIVED` | Archived | Archivado |
| `SUBMITTED` | Waiting for review | En espera de revisión |
| `REVIEWED` | Reviewed | Revisado |

Never send translated labels to the backend.
