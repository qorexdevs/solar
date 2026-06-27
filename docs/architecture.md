# Architecture

A short tour of how SolarCalc India turns user inputs into a feasibility
report. It complements the [README](../README.md) (high-level overview) and
[`docs/prd.md`](prd.md) (product requirements).

## Layers

```
+-------------------------------------------+
|  routes/  (per-route folders, orchestrate UI + state)
+-------------------------------------------+
|  store/   useScenarioStore, useSettingsStore (Zustand + persist)
+-------------------------------------------+
|  lib/     Pure logic: catalog/, calc/, scenario/, exporters/, format
+-------------------------------------------+
|  types/   Scenario, Materials, Catalog, ProjectType (domain shapes)
+-------------------------------------------+
```

Routes import from `lib/` and `store/`; `lib/` only depends on `types/`.
This keeps the calc engine and catalog logic UI-agnostic and trivially
testable.

## Data flow

Every scenario starts with the user's active **price catalog** and the
project-type **Bill of Materials (BOM)**. Together they give us:

1. **Materials**: `deriveMaterials({ sizeMW, bom, catalog })` produces a
   normalized `Materials` map with per-row `unitCost` and `quantity`.
2. **Catalog defaults**: `applyCatalogDefaults(scenario, catalog)` patches the
   scenario's `basics`, `revenue.ppaEscalationPct`, and `om.percentOfCapex`
   from the catalog's per-project-type defaults block.
3. **Computation**: `computeScenario(scenario, overrides?)` runs the finance
   engine and returns `ComputedResults` for the dashboard, charts, and
   exporters.

```
catalog + BOM + sizeMW
       │
       ▼ deriveMaterials
   Materials
       │
       ▼ applyCatalogDefaults (basics, revenue, om)
   Scenario
       │
       ▼ computeScenario(scenario, overrides?)
   ComputedResults  (capex, energy, revenue, om, loan, cashflows,
                    cumulativeCF, npv, irr, payback, co2, pnl)
```

## Override flags

Two parallel "manual override" mechanisms make sure user-authored values
survive re-derivation:

### `manualOverrides.materials`

Per-row flags `{ unitCost?: boolean; quantity?: boolean }` keyed by
`MaterialKey`. When `deriveMaterials` runs (e.g. on size or project-type
change, or on **Re-price to latest**), any flagged field on a row keeps the
previous value rather than re-deriving. Set in `CostBreakdownPanel` whenever
the user edits a row, cleared when the user explicitly resets a row.

### `manualOverrides.defaults`

Per-field flags for the seven `CATALOG_DEFAULT_FIELDS` (lifespan,
degradation, inflation, discount, CUF, PPA escalation, O&M %). When
`applyCatalogDefaults` runs (e.g. on project-type change), any flagged field
keeps its existing value. The builder marks **all** of these as touched on
save so a future project-type change won't quietly rewrite them.

## What-if overrides

`computeEstimate` accepts an `EstimateOverrides` object that the **Results**
dashboard uses for live sliders, without mutating the saved estimate:

| Override               | Effect                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `financedPctOverride`  | Replace `financing.financedPct`. Used by the Funding Mix slider.                                                               |
| `extraAnnualPrincipal` | Add a flat extra principal each post-grace year.                                                                               |
| `autoAbsorbSurplus`    | Compute each post-grace year's extra principal as the available CF surplus, retiring the loan as fast as the project supports. |

The Loan Prepayment slider's max is computed by an iterative fixed-point
search (`usePrepaymentMax`) so it lands at "no loan-active year goes
negative" — see the comment in
[`src/routes/Results/usePrepaymentMax.ts`](../src/routes/Results/usePrepaymentMax.ts).

## Catalog migration story

Scenarios store a `catalogVersionId` so older work stays reproducible even
after the active catalog changes. Behaviour:

- **New scenario**: `catalogVersionId` = active catalog id at creation.
- **Active catalog changes**: existing scenarios are unaffected — they keep
  pointing at their original catalog.
- **Stale-catalog banner**: when a scenario's referenced catalog ≠ the
  current active catalog, the Results dashboard shows a banner with a
  one-click **Re-price to latest** action.
- **Re-pricing**: re-runs `deriveMaterials` against the new catalog and
  bumps `catalogVersionId`. Per-row manual overrides are preserved.

The store also runs a one-shot migration (`ensureLegacyCatalogBootstrap`)
that synthesizes a `LEGACY_CATALOG_ID` snapshot from any pre-v2 scenario,
so previously-saved data continues to load.

## Calc engine internals (`src/lib/calc/`)

| File          | Public exports                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `energy.ts`   | `annualEnergyKWh`, `annualEnergyKWhFromYield`, `specificYieldKWhPerKWpYr`, `yearlyEnergy`, `yearlyRevenue`         |
| `om.ts`       | `yearlyOM`                                                                                                         |
| `capex.ts`    | `capexBreakdown`, `CapexBreakdown`                                                                                 |
| `loan.ts`     | `loanSchedule`, `loanAmountForEstimate`, `LoanRow`                                                                 |
| `cashflow.ts` | `yearlyCashFlows`, `cumulativeCF`, `npv`, `irr`, `mirr`, `profitabilityIndex`, `equityMultiple`, `peakFundingNeed` |
| `dscr.ts`     | `dscrSeries`, `minDSCR`, `avgDSCR`                                                                                 |
| `payback.ts`  | `paybackYears`, `breakEvenYear`, `discountedPaybackYears`                                                          |
| `lcoe.ts`     | `lcoeFromSeries`, `lcoeINRPerKWh`                                                                                  |
| `ppa.ts`      | `solvePPARate`, `tariffSchedule`, `withPPARate`                                                                    |
| `co2.ts`      | `co2Tonnes`, `co2Equivalents`, `CO2_FACTOR_KG_PER_KWH`, `TONNES_CO2_PER_TREE_YEAR`                                 |
| `compute.ts`  | `computeEstimate`, `ComputedResults`, `FinanceResults`, `PnLRow`, `EstimateOverrides`                              |
| `index.ts`    | barrel — public surface for `@/lib/calc`                                                                           |

Each module is pure and testable in isolation; the dashboard never reaches
into individual modules — it always goes through `computeEstimate`.
