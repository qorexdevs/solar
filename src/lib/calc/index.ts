/**
 * Solar plant feasibility calc engine.
 *
 * Public surface re-exported here so consumers can keep importing from
 * `@/lib/calc`. Internal modules (energy, om, capex, …) split the engine
 * by concept; see [docs/architecture.md](../../../docs/architecture.md) for
 * the data-flow tour.
 */
export {
  capexBreakdown,
  OTHER_SCOPE_GROUP_LABEL,
  type CapexBreakdown,
  type CapexCategoryGroup,
  type CapexLineSummary,
} from './capex';
export {
  cumulativeCF,
  equityMultiple,
  irr,
  mirr,
  npv,
  peakFundingNeed,
  profitabilityIndex,
  yearlyCashFlows,
} from './cashflow';
export { avgDSCR, dscrBreaches, dscrSeries, llcr, minDSCR, plcr } from './dscr';
export {
  CO2_FACTOR_KG_PER_KWH,
  TONNES_CO2_PER_TREE_YEAR,
  co2Tonnes,
  co2Equivalents,
} from './co2';
export {
  computeEstimate,
  type ComputedResults,
  type FinanceResults,
  type PnLRow,
  type EstimateOverrides,
} from './compute';
export {
  annualEnergyKWh,
  annualEnergyKWhFromYield,
  AVG_HOME_ANNUAL_KWH,
  homesPowered,
  specificYieldKWhPerKWpYr,
  yearlyEnergy,
  yearlyRevenue,
} from './energy';
export { lcoeFromSeries, lcoeINRPerKWh } from './lcoe';
export { loanAmountForEstimate, loanSchedule, type LoanRow } from './loan';
export { yearlyOM } from './om';
export { breakEvenYear, discountedPaybackYears, paybackYears } from './payback';
export {
  type Indexation,
  type PPASolveArgs,
  type PPASolveResult,
  solvePPARate,
  tariffSchedule,
  withPPARate,
} from './ppa';
