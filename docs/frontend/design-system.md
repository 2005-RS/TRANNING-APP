# Design system

Original athletic / technical language. Dark-first. Not a Bootstrap admin, not a Material demo, not a default shadcn gallery.

Do not clone Nike Training Club, Hevy, Ladder, WHOOP, Fitbod, or Muscle & Motion layouts, photography, or 3D assets. Borrow only principles: workout speed, metric hierarchy, strong type, useful anatomy later.

Temporary identifier in UI until brand exists: **Training Platform**.

## Principles

1. Hierarchy over decoration.
2. Numbers are first-class (Geist Mono).
3. Client gym UX is thumb-sized; Trainer/Admin is dense and keyboard-friendly.
4. One token system for dark and light.
5. Motion is short and functional.
6. Data stays neutral — no invented health judgments.

## Color / semantic tokens

Define in CSS variables (F01). Components consume tokens, never raw hex in features.

```css
--background           /* near-black graphite (dark) / paper (light) */
--foreground           /* near-white / near-ink */
--card
--card-foreground
--muted
--muted-foreground
--border
--ring
--primary              /* brand accent — configurable, not hardcoded in components */
--primary-foreground
--secondary
--secondary-foreground
--accent
--accent-foreground
--success
--success-foreground
--warning
--warning-foreground
--danger
--danger-foreground
--info
--info-foreground
--chart-1 … --chart-4  /* restrained, theme-aware series — not rainbow */
```

Dark surfaces: elevated charcoal cards, 1px `--border`, controlled shadow. Optional hairline gradient on **hero** MetricCards only.

Avoid default-everywhere glassmorphism, blur, neon glow.

## Themes

`dark` | `light` | `system`. Same names, different values. Default documented preference: **dark**. Persist preference in `localStorage` is allowed for **theme only**, never for tokens.

## Typography

| Role | Family | Use |
| --- | --- | --- |
| UI | Geist Sans | almost everything |
| Numeric | Geist Mono | load, reps, timers, kcal, 1RM, bodyweight, rest seconds |

Scale (token names):

| Token | Role |
| --- | --- |
| `--text-display` | Workout timer, PR number, rest clock |
| `--text-h1` | Page titles |
| `--text-h2` | Section |
| `--text-h3` | Card title |
| `--text-body` | Default |
| `--text-body-small` | Secondary |
| `--text-label` | Form labels, overline |
| `--text-caption` | Meta, timestamps |
| `--text-numeric-display` | Geist Mono display |

Readability over decorative tracking. Do not set the whole UI to mono.

## Spacing

4px base. Allowed scale: `0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24`. No 13/17/23px except documented exceptions (hairline borders).

Client workout controls: minimum 44×44 CSS px touch target; prefer 48–56px for weight/reps steppers.

## Radius

| Token | Use |
| --- | --- |
| `--radius-sm` | badges, inputs compact |
| `--radius-md` | buttons, inputs |
| `--radius-lg` | cards |
| `--radius-xl` | sheets, hero cards |
| `--radius-2xl` | rare marketing/login hero |
| `--radius-full` | avatars, pills |

Do not pill every card.

## Shadows / borders

Dark: prefer border + slight elevation over heavy drop shadow. Light: soft shadow `sm/md` only. `--shadow-hero` reserved for login/workout heroes.

## Motion tokens

| Token | Duration |
| --- | --- |
| `--motion-instant` | 100–150ms |
| `--motion-fast` | 160–220ms |
| `--motion-panel` | 220–300ms |

Easing: standard decelerate. No 500ms+ UI chrome. See [motion-and-3d.md](./motion-and-3d.md).

## Z-index

`--z-base`, `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`, `--z-workout-focus` (focus mode above app chrome).

## Containers

| Token | Width |
| --- | --- |
| `--container-client` | full width, padding 16–20px |
| `--container-md` | 768 |
| `--container-lg` | 1024 |
| `--container-xl` | 1280 |
| `--container-wide` | 1440 Trainer/Admin |

## Cards

Subtle border, `--card` fill, optional 1px top highlight on MetricCard. No blur soup.

## Forms

Label + control + described-by error. Destructive color is not the only error cue (icon + text). Trainer plan editors: sectioned, not one infinite scroll of unlabeled inputs.

## Tables

TanStack Table + shadcn table chrome. Server `page`/`limit`. Loading: skeleton rows. Empty: EmptyState. Row actions in a dropdown. On small screens: card-stack or horizontal scroll with sticky first column — never fake-paginate thousands of rows on the client.

## Charts

Recharts in ChartCard. Token stroke colors. Tooltip. Empty state. Minimal grid. No 3D charts. No medical color coding.

## Loading

Section skeletons on dashboards. Button spinner for 200–800ms actions. No full-app spinner except first authenticated bootstrap.

## Empty states

Title + one sentence + **one** primary action the role can actually perform.

Examples:

- Client, no active training plan: explain trainer assigns plans; no “Create plan” button.
- Trainer, no assigned clients: explain admin assignment; no silent create-client unless API allows (it does not for TRAINER).

## Breakpoints (Tailwind defaults)

| Name | Width | Philosophy |
| --- | --- | --- |
| default | &lt;640 | Client primary |
| sm | 640 | large mobile |
| md | 768 | tablet |
| lg | 1024 | Trainer/Admin primary |
| xl | 1280 | wide desktop |
| 2xl | 1536 | optional extra columns |

Client: write unprefixed mobile styles first. Trainer/Admin: design at `lg`, then ensure essential workflows work at `md`/`sm`.

## Component inventory

### Foundation (F01–F03)

Button, IconButton, Input, Textarea, Select, Checkbox, Switch, FormField, Card, Badge, Avatar, Separator, Tooltip, Dialog, AlertDialog, Sheet, Dropdown, Tabs, Skeleton, Progress, Toast (Sonner), Table shell.

### Feature-driven (when the feature lands)

Slider, Radio, Popover, Accordion, Breadcrumb, Pagination, Command (Trainer palette later), AppShell, MobileBottomNav, DesktopSidebar, PageHeader, MetricCard, StatDelta, DataTable, EmptyState, ErrorState, LoadingSection, ConfirmAction, DateRangeControl, ChartCard, NotificationItem.

### Deferred

Command palette, full calendar, rich text. No Rive/3D wrappers until F06/F13.

### Feature-only (never `shared/ui`)

WorkoutCard, ExerciseCard, ExerciseMediaViewer, Exercise3DViewer, SetRow, RestTimer, WorkoutProgressHeader, PerformanceChart, BodyMetricCard, NutritionMacroSummary, MealCard, CheckInStatusCard, TrainerClientRow.

## Copy tone

Clear, concise, professional. Prefer “No workouts completed in the last 7 days” over shaming or fake hype. No medical claims.
