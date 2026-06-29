# Architecture

A short tour of how SolarCalc India turns user inputs into a feasibility
report. It complements the [README](../README.md) (high-level overview) and
[`docs/prd.md`](prd.md) (product requirements).

## Layers

```
+-------------------------------------------+
|  routes/  (per-route folders, orchestrate UI + state)
+-------------------------------------------+
|  store/   useEstimateStore, useCatalogStore, useTemplateStore,
|           useFacetStore (Zustand + persist)
+-------------------------------------------+
|  lib/     Pure logic: composer/, templates/, calc/, estimate/,
|           catalog/, facets/, exporters/, irradiance/, format
+-------------------------------------------+
|  types/   Estimate, ScenarioTemplate, TemplateFacet,
|           MaterialCatalog, ProjectType (domain shapes)
+-------------------------------------------+
```

Routes import from `lib/` and `store/`; `lib/` only depends on `types/`.
This keeps the composer, calc engine, and catalog logic UI-agnostic and
trivially testable.

## Data flow

An estimate is assembled from **facets**, **templates**, and the **material
catalog**, then run through the finance engine on demand.

1. **Facets and selections**: each `TemplateFacet` is one axis of the build
   (voltage class, mounting, etc.). `selections` holds one chosen
   `ScenarioTemplate` snapshot per facet (`{ templateId, selectedVersion }`,
   or `null` for a skipped optional facet). `selectedOptionsPerTemplate`
   records which optional template lines the user toggled on.
2. **Composition**: `composeEstimate(args: ComposeEstimateArgs)` walks the
   facets in sequence, expands each chosen template's lines against the
   material catalog, scales every line by a `ScalingContext`
   (`baseCapacityKW` -> `targetCapacityKW`, plus `syncType`/`projectType`
   from the engine template), drops archived catalog items, and merges
   duplicate catalog refs by their compose mode. It returns a
   `MaterializedBOM` (`mainLines` + `otherLines`) and `EstimateTotals`. The
   result is stored on the `Estimate`, not recomputed per render.
3. **Computation**: `computeEstimate(estimate, overrides?)` reads the stored
   `materialized` + `totals`, builds the capex breakdown, and - only when a
   finance layer is enabled - runs the finance engine, returning
   `ComputedResults` for the dashboard, charts, and exporters.

```
facets + selections + selectedOptionsPerTemplate + catalog + targetCapacityKW
       |
       v  composeEstimate (lib/composer)
   MaterializedBOM + EstimateTotals  (stored on the Estimate)
       |
       v  computeEstimate(estimate, overrides?)  (lib/calc)
   ComputedResults  (capex, totals, finance: energy, revenue, om, loan,
                    cashflows, cumulativeCF, npv, irr, payback, co2, pnl)
```

The finance layer is optional: with no enabled `finance` on the estimate,
`computeEstimate` returns `{ capex, totals, finance: null }` and the
dashboard shows the costing view only.

## Override mechanisms

Two override maps on the `Estimate` let the user steer the build without
forking the underlying templates:

### `composeOverrides`

`ComposeOverridesMap` keyed by `catalogItemId`. When the same catalog item is
pulled in by more than one template, its compose mode decides how the
quantities combine: `sum` adds them, `max` takes the largest. The default
comes from the catalog item (or a per-line override); `composeOverrides` lets
the user pin a mode per item. Set via `setComposeOverride`; it survives
recomposition because it feeds straight back into `composeEstimate`.

### `lineOverrides`

`EstimateLineOverridesMap` keyed by materialized line id - transient manual
edits to a single row's `itemName`, `uom`, `quantity`, or `rate`. Editing a
cell calls `setLineOverride`, which runs `retotalWithOverrides`: it reapplies
the overrides and recomputes totals **without** re-running the composer, so a
single edit is cheap. These overrides are intentionally fragile - any path
that recomposes the BOM (`rematerialise` on a capacity, selection, options, or
compose-mode change) clears them, and the UI warns before triggering that.

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

## Persistence and recompute

Estimates, catalog, templates, and facets each live in their own Zustand
store with `persist`. `useEstimateStore` persists under
`solar-estimates-v2` and runs a custom `merge` that re-sanitizes each saved
estimate's location (`parseFiniteLatLng`) on rehydrate, so malformed
coordinates from older saves drop cleanly instead of poisoning the yield
model.

Because the catalog, templates, and facets are separate stores, an estimate
keeps its own `materialized` snapshot rather than re-deriving on every read.
When inputs that affect the BOM change - target capacity, selections, line
options, or a compose override - the store calls `rematerialise`, which pulls
the **current** facets/templates/catalog from their stores and re-runs
`composeEstimate` via `recomputeMaterialization`. Selection snapshots are
version-synced (`syncSelectionVersions`) on every recompute so an estimate
tracks the latest template revision automatically.

## Calc engine internals (`src/lib/calc/`)

| File          | Public exports                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `energy.ts`   | `annualEnergyKWh`, `annualEnergyKWhFromYield`, `specificYieldKWhPerKWpYr`, `yearlyEnergy`, `yearlyRevenue`         |
| `om.ts`       | `yearlyOM`                                                                                                         |
| `capex.ts`    | `capexBreakdown`, `CapexBreakdown`                                                                                 |
| `loan.ts`     | `loanSchedule`, `loanAmountForEstimate`, `LoanRow`                                                                 |
| `cashflow.ts` | `yearlyCashFlows`, `cumulativeCF`, `npv`, `irr`, `mirr`, `profitabilityIndex`, `equityMultiple`, `peakFundingNeed` |
| `dscr.ts`     | `dscrSeries`, `minDSCR`, `avgDSCR`, `dscrBreaches`, `llcr`, `plcr`                                                 |
| `payback.ts`  | `paybackYears`, `breakEvenYear`, `discountedPaybackYears`                                                          |
| `lcoe.ts`     | `lcoeFromSeries`, `lcoeINRPerKWh`                                                                                  |
| `ppa.ts`      | `solvePPARate`, `tariffSchedule`, `withPPARate`                                                                    |
| `co2.ts`      | `co2Tonnes`, `co2Equivalents`, `CO2_FACTOR_KG_PER_KWH`, `TONNES_CO2_PER_TREE_YEAR`                                 |
| `compute.ts`  | `computeEstimate`, `ComputedResults`, `FinanceResults`, `PnLRow`, `EstimateOverrides`                              |
| `index.ts`    | barrel — public surface for `@/lib/calc`                                                                           |

Each module is pure and testable in isolation; the dashboard never reaches
into individual modules — it always goes through `computeEstimate`.
