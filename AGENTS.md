# AGENTS.md — SolarCalc India

This file is the shared instruction set for AI coding agents (Cursor, Claude Code, Codex, etc.) working in this repo. **Both human contributors use Cursor**, so consistency between AI sessions matters as much as consistency between people. Read this file in full before making changes.

The deeper "why" lives in three docs you should also read on first contact:

- [`README.md`](README.md) — what the app is, how to run it, source layout
- [`docs/architecture.md`](docs/architecture.md) — data flow, override flags, calc internals
- [`docs/design.md`](docs/design.md) — visual contract, tokens, chart system

## What this app is

SolarCalc India is a mobile-first PWA for evaluating solar plant feasibility (0.25–5 MW projects, all prices in ₹). Built with Vite + React 18 + TypeScript (strict), Tailwind, Zustand (persisted), Recharts, jsPDF, SheetJS, vite-plugin-pwa.

Two non-negotiables that flow through every decision:

1. **Numbers are first-class.** Every figure on screen is tabular-numeric and uses `lib/format.ts` helpers (₹ / lakh / crore / %, etc.). Never inline-format currency.
2. **Mobile-first, ≥360px wide, tap-target ≥48px.** Bottom nav under `md`, top nav at `md+`. Same routes, same data, same store on both — never gate functionality behind `hidden md:block`.

## Architectural layering — strict, never violate

```
routes/  →  store/  →  lib/  →  types/
```

- `routes/` may import from `store/`, `lib/`, `components/`, `types/`.
- `store/` may import from `lib/`, `types/`. **Never** from `routes/` or `components/`.
- `lib/` may import from `types/` only. **Never** from `store/`, `routes/`, `components/`, or React.
- `types/` is the leaf — pure type declarations.

If an agent suggests `import` lines that violate this, reject the change. The calc engine and catalog logic must stay UI-agnostic so they remain trivially testable.

## Where things live

- `src/lib/calc/` — finance engine (energy, om, capex, loan, cashflow, payback, co2, compute). Pure functions only. Public surface is `computeScenario` via the barrel. UI never reaches into individual modules.
- `src/lib/catalog/` — `deriveMaterials({ sizeMW, bom, catalog })`, `applyCatalogDefaults`, BOM/catalog import (Excel/CSV).
- `src/lib/estimate/` — estimate builder helpers, line overrides, factory.
- `src/lib/templates/` — template logic and seeds.
- `src/lib/composer/`, `src/lib/scenario/`, `src/lib/exporters/` — see source.
- `src/lib/format.ts` — `formatCurrency`, `formatLakhCrore`, `formatPercent`, `formatYears`, `formatMW`, `formatTonnes`, `formatKWh`. **Always use these.**
- `src/store/` — Zustand stores: `useScenarioStore`, `useSettingsStore`, `useEstimateStore`, `useCatalogStore`, `useTemplatesStore`. All persisted to `localStorage` with versioned migrations.
- `src/components/ui/` — primitives (Button, KpiCard, Slider, Switch, Tag, Tooltip, PillTab, Icon, FacetSegmentedControl).
- `src/components/layout/` — AppShell, TopBar, BottomNav, PWAInstallPrompt.
- `src/components/charts/` — Recharts wrappers (CashFlowChart, MultiCashFlowChart, CostDonut, YearlyBarChart).
- `src/components/builder/` — feature-scoped composites (CostBreakdownPanel, EstimateCard).
- `src/components/irradiance/` — irradiance feature (CityCombobox, LocationPicker, IrradianceCharts).
- `src/routes/<Route>/` — one folder per route, `index.tsx` orchestrates state and stitches subcomponents. Calc never happens inside a route component.

## House rules — non-negotiable

### TypeScript

- Strict mode. No `any` without a one-line `// reason` comment.
- Prefer `type` for unions/aliases, `interface` for object shapes that may be extended.
- All public functions in `src/lib/` are explicitly typed (params + return).
- Never use non-null assertions (`!`) on values from stores or external data — narrow them.

### Tests

- Vitest. Tests live next to source: `foo.ts` → `foo.test.ts`.
- **Any change to `src/lib/` requires adding or updating a test.** No exceptions.
- Tests should not import from `src/store/` or `src/routes/`.
- Run `npm test` before committing. 141 tests today; that number should only go up.

### Money, formatting, units

- All currency in ₹. Use `formatCurrency`, `formatLakhCrore` from `src/lib/format.ts`.
- Percent: `formatPercent` (handles 0.12 → "12%").
- Energy: `kWh` for small, `MWh` / `GWh` via helpers; `MW` for capacity.
- CO₂: tonnes for cumulative, kg for per-unit. `CO2_FACTOR_KG_PER_KWH = 0.82` (India CEA grid factor — do not change without PRD update).
- Never inline `toLocaleString`, `toFixed`, or hand-roll a `₹`/`%` string in a component.

### Stores (Zustand)

- Use `persist` middleware with an explicit `name` and `version`.
- **Schema change → bump version + write a migration in the same commit.** Never both at once without a migration.
- Selectors over destructuring the whole store: `const ppa = useEstimateStore(s => s.ppaRate)`, not `const { ppaRate } = useEstimateStore()`.
- Read `src/store/estimates.ts` and `src/store/catalog.ts` before adding a new store — match the patterns there.

### Catalog & override flags

There are two parallel manual-override mechanisms in `src/store/estimates.ts` (and the catalog/derive layer). Read [`docs/architecture.md`](docs/architecture.md) §"Override flags" before touching either:

- `manualOverrides.materials` — per-row `{ unitCost?, quantity? }` flags survive re-derivation on size/type/catalog change.
- `manualOverrides.defaults` — per-field flags for the seven `CATALOG_DEFAULT_FIELDS` (lifespan, degradation, inflation, discount, CUF, PPA escalation, O&M %).

If you change derivation logic, you must explicitly handle both override paths in the same change.

### UI / design tokens

- **Never hard-code a hex, px, ms, or shadow string in a `.tsx` file.** Use a Tailwind token from [`tailwind.config.ts`](tailwind.config.ts).
- The full token list and component patterns are in [`docs/design.md`](docs/design.md). Read it before adding any UI.
- For numbers in markup: `text-data tabular` (KPIs) or `text-body tabular` (inline). Never plain numbers in a column.
- Icons via `<Icon name="..." />` only — never inline `<span class="material-symbols-outlined">`.
- One `secondary` (sunlight amber) accent per screen, max.
- `success` for positive cash flow, `error` for negative — never invent new greens/reds.

### Charts

- Use `chartTheme` helpers and the categorical/sequential/diverging palettes in [`docs/design.md`](docs/design.md) §9.
- Series 1 is always `primary`. With ≥3 series, vary stroke style as well as colour (colour-blind safety).
- **Forbidden**: 3D charts, true pie charts (use donut), dual-axis line charts, bubble charts, radial bars.

### Mobile

- All numeric inputs use `inputmode="decimal"` (₹/%) or `"numeric"` (years).
- Tap targets ≥ 48px (`h-touch-target`).
- Tables: `overflow-x-auto` + sticky first column. Reference: [`src/routes/Results/PnLTable.tsx`](src/routes/Results/PnLTable.tsx).
- If a control doesn't fit on mobile, **redesign it** (sheet, expandable section, separate route). Don't hide it.

### Accessibility

- WCAG-AA contrast both themes; respect `prefers-reduced-motion` (handled globally in `src/index.css` — don't override per component).
- Visible focus rings; never remove them.
- Colour is never the only signal — pair with shape, label, or icon.

## Commands you'll run

```bash
npm install            # first time
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build (must be green before pushing)
npm run preview        # preview production build
npm run test           # vitest run (must be green before pushing)
npm run test:watch     # vitest in watch mode while developing
npm run lint           # eslint . (must be green before pushing)
npm run format         # prettier --write .
npm run format:check   # prettier --check . (must be green before pushing)
```

The pre-commit hook runs lint + format check + related tests on staged files; full lint/test/build is your responsibility before push.

## How we work — process

We're a small team pushing to `main` directly. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow. The TL;DR for agents:

- **Before any commit**: `npm run lint && npm test && npm run format:check`. The hook catches some, not all.
- **Touching `src/lib/calc/`, `src/lib/catalog/`, or `src/store/`?** Mention it in the commit body. These are the high-risk areas.
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- **No commits with skip-hooks** (`--no-verify`) without explicit human approval.
- **No `any`, no `// eslint-disable`, no `// @ts-ignore`** without a one-line reason and a follow-up issue.

## What to do when

| Situation                  | Do                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Adding a new chart         | Read [`docs/design.md`](docs/design.md) §9; use `chartTheme`; series 1 = primary.       |
| Adding a new UI primitive  | Place in `src/components/ui/`; document in [`docs/design.md`](docs/design.md) §10.      |
| Changing the calc engine   | Write/update tests in the same commit.                                                  |
| Adding a store field       | Bump store version + write migration in the same commit.                                |
| Changing catalog/BOM logic | Handle both `manualOverrides` paths; re-run `derive.test.ts`.                           |
| Adding a new route         | Create `src/routes/<Route>/index.tsx` + subcomponents; wire into `src/App.tsx` and nav. |
| Currency / unit display    | Use `lib/format.ts` — never roll your own.                                              |
| Stuck on intent            | Ask. We're co-located; don't guess product behaviour.                                   |

## What's deliberately out of scope right now

- Server / backend / auth — this is a local-only PWA today.
- CI/CD — set up in week 2 (see [`docs/onboarding.md`](docs/onboarding.md) roadmap).
- Multi-user collaboration / sync — single-user, `localStorage`-only for now.
- i18n — English + ₹ only.

If you find yourself building something in this list, stop and ask first.
