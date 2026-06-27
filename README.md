# SolarCalc India

A mobile-first PWA for evaluating solar plant feasibility (0.25–5 MW projects, all
prices in ₹). Built per the spec in [`docs/prd.md`](docs/prd.md); the original
Stitch design references live in [`docs/design/`](docs/design).

## New here?

- **First time in the repo?** Read [`docs/onboarding.md`](docs/onboarding.md) — it's the day-1 reading path.
- **Coding conventions** (for both humans and AI agents): [`AGENTS.md`](AGENTS.md) and [`.cursor/rules/`](.cursor/rules/).
- **How we work** (push-to-main, hooks, high-risk areas): [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Optional spec-driven features:** [GitHub Spec Kit](https://github.com/github/spec-kit) — Cursor skills in [`.cursor/skills/`](.cursor/skills/) (e.g. `speckit-specify`, `speckit-plan`); templates and constitution stub in [`.specify/`](.specify/). Install the CLI with [`uv`](https://docs.astral.sh/uv/): `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git` (then `specify check`).

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS with the full Stitch design tokens
- React Router v6, Zustand (with `persist` to `localStorage`)
- Recharts for visualisations
- jsPDF + `jspdf-autotable` for PDF export, SheetJS (`xlsx`) for Excel export
- `vite-plugin-pwa` (injectManifest) + custom Workbox service worker
- Vitest for unit tests; ESLint flat config + Prettier for tooling

## Getting started

```bash
npm install
npm run dev            # dev server on http://localhost:5173
npm run build          # production build (outputs to dist/)
npm run preview        # preview a production build
npm run test           # 65 unit tests across calc / catalog / scenario / format
npm run lint           # eslint .
npm run format         # prettier --write .
npm run format:check   # prettier --check .
```

## What's in the box

- **Scenario list** — overview tiles (total capacity, count, avg IRR), cards with
  status border + projected IRR, duplicate/delete, mobile FAB, multi-select for
  Compare.
- **Single-page builder** — name + project type, plant size, PPA rate, financing
  (financed %, interest, term, grace period) with a sticky **Estimate / Equity /
  Loan / Year-1 O&M** sidebar. Materials auto-derive from the active price
  catalog × the project-type Bill of Materials. A collapsible **Cost Breakdown**
  panel lets you override individual cells (name, unit, qty, rate) on a
  materialized line; these edits retotal without re-running the composer and
  are cleared on a recompose, with a warning before that happens.
- **Results dashboard** — IRR / Payback / NPV KPI cards, cumulative cash flow
  chart with break-even marker, year-by-year Net CF bars, CAPEX donut, two
  what-if controls:
  - **Funding Mix** — adjust equity vs loan share without saving the scenario.
  - **Loan Prepayment** — slider for extra monthly principal payments, plus an
    **Auto-absorb** switch that applies each post-grace year's full surplus to
    the loan so it retires as fast as the project supports.
    Plus an expandable year-by-year P&L and a CO₂ offset card.
- **Compare** — multi-select scenarios, multi-line cumulative CF chart, table
  with per-metric best-value highlighting (CAPEX, IRR, NPV, payback, LCOE,
  lifetime CO₂, plant size, CUF).
- **Export** — PDF (cover + summary + CAPEX + P&L + methodology, all toggleable)
  and Excel (Summary / Inputs / CAPEX / P&L / Loan Schedule / Methodology),
  scoped per scenario.
- **Settings** — Price Catalog and BOM Templates tabs:
  - upload Excel/CSV catalogs (with a downloadable template), edit prices and
    per-project-type defaults inline, keep older catalogs around so existing
    scenarios stay reproducible;
  - tweak the per-MW BOM rules (panels, cables, inverters, mounting,
    transformers, civil, BoS) per project type.
- **PWA** — installable manifest, service worker that precaches the shell + caches
  Google Fonts, Android install prompt, iOS Add-to-Home-Screen support.

## Architecture

A single-direction data flow:

```
+------------+    +-----------------+    +------------------+    +---------+
|  facets +  | -> |   composer/     | -> |  MaterializedBOM | -> |  calc/  |
|  catalog   |    | (composeEstimate)|    |  + totals        |    | engine  |
+------------+    +-----------------+    +------------------+    +---------+
                                                                      |
                                                                      v
                                                              ComputedResults
                                                                      |
                                       +-----------+-------------+-----+--+
                                       |           |             |        |
                                  Results /     Compare       Export    Charts
                                  what-if      (multi-line)   (pdf/xlsx)
```

- **Stores** (`src/store/`): `useEstimateStore` for saved estimates +
  comparison set, plus `useCatalogStore`, `useTemplateStore`, and
  `useFacetStore` for the catalog, BOM templates, and facets. All persist to
  `localStorage`.
- **Composer** (`src/lib/composer/`): `composeEstimate` expands the chosen
  template per facet against the catalog, scales lines to the target
  capacity, and merges duplicate catalog refs into a `MaterializedBOM` +
  `EstimateTotals`.
- **Calc engine** (`src/lib/calc/`): `computeEstimate(estimate, overrides)` →
  `ComputedResults`. Split per concept: energy, O&M, capex, loan, cashflow,
  payback, CO₂ — see [`docs/architecture.md`](docs/architecture.md).
- **Routes** (`src/routes/`): one folder per route, `index.tsx` orchestrates
  state and stitches together extracted subcomponents.

For deeper details on the compose pipeline, override mechanisms, and
persistence, read [`docs/architecture.md`](docs/architecture.md).

## Design

The visual contract for every component, chart, and route lives in
[`docs/design.md`](docs/design.md): tokens (light + dark), typography,
spacing scale, motion, the data-viz system, and short component patterns.
Read it before adding any UI.

## Source layout

```
src/
├── App.tsx
├── main.tsx
├── pwa.ts
├── sw.ts
├── index.css
├── types/                 # Scenario, Materials, Catalog, ProjectType + barrel
├── lib/
│   ├── calc/              # finance engine (energy, om, capex, loan, cashflow, ...)
│   ├── catalog/           # defaults, derive, legacy, IO
│   ├── scenario/          # createScenario, duplicateScenario, seedScenarios
│   ├── exporters/         # PDF + Excel report builders
│   ├── format.ts          # ₹ lakh/crore, percent, years, MW, tonnes, kWh
│   ├── filename.ts        # safeFileName helper
│   └── uid.ts             # shared crypto-randomUUID-backed id helper
├── store/                 # Zustand persisted stores (scenarios, settings)
├── components/
│   ├── layout/            # AppShell, TopBar, BottomNav, PWAInstallPrompt
│   ├── ui/                # Button, Icon, KpiCard, Slider, Switch, Tag, Tooltip
│   ├── builder/           # EstimateCard, CostBreakdownPanel
│   └── charts/            # CashFlowChart, YearlyBarChart, CostDonut, MultiCashFlowChart
├── routes/
│   ├── ScenarioList/      # index.tsx + ScenarioCard, SummaryTile, EmptyState
│   ├── ScenarioBuilder/   # index.tsx + FormSection, Stat, helpers
│   ├── Results/           # index.tsx + KPI, what-if, P&L, CO₂, hooks, sliders
│   ├── Compare/           # index.tsx + metrics
│   ├── Export/            # index.tsx + FormatTab, ToggleRow, PreviewRow
│   └── Settings/          # index.tsx + Catalog/BOM tabs and editors
└── test/
    └── setup.ts
docs/
├── prd.md                 # product requirements
├── architecture.md        # calc pipeline + override + catalog migration tour
└── design/                # original Stitch HTML mocks
```

## Calculations

All financial logic lives under [`src/lib/calc/`](src/lib/calc) and is exercised
by [`src/lib/calc/index.test.ts`](src/lib/calc/index.test.ts) (40 tests).
Highlights:

- IRR uses Newton-Raphson seeded at 10% with a bisection fallback so degenerate
  cash-flow shapes (e.g. strongly-negative or non-converging) still resolve.
- Payback comes in two flavours: simple (first year cumulative CF turns
  positive) and discounted (same crossover on cash flows discounted at the
  project rate), both interpolated across the sign change.
- Loan amortisation supports a configurable grace period (interest-only)
  followed by an annuity, plus optional extra principal — either a flat per-year
  amount, an explicit per-year vector, or the **Auto-absorb** mode that
  computes each post-grace year's extra as the available CF surplus.
- O&M derives a Year-1 base from `omPercentOfCapex × CAPEX` then inflates;
  per-year overrides fully replace that year's value.
- CO₂ uses the India CEA grid factor of **0.82 kg/kWh** per the PRD.

## Mobile

- All numeric inputs use `inputmode="decimal"` (₹/%) or `"numeric"` (years).
- Tap targets ≥ 48px (`h-touch-target` token).
- P&L and Loan tables scroll horizontally with a sticky year column.
- Bottom nav under `md`, top nav at `md` and up — same routes, same data.
