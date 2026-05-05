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
export { cumulativeCF, irr, npv, yearlyCashFlows } from './cashflow';
export { CO2_FACTOR_KG_PER_KWH, co2Tonnes } from './co2';
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
  yearlyEnergy,
  yearlyRevenue,
} from './energy';
export { lcoeINRPerKWh } from './lcoe';
export { loanAmountForEstimate, loanSchedule, type LoanRow } from './loan';
export { yearlyOM } from './om';
export { breakEvenYear, paybackYears } from './payback';
export { maxMonthlyPrepayment } from './prepayment';
export {
  type Indexation,
  type PPASolveArgs,
  type PPASolveResult,
  solvePPARate,
  tariffSchedule,
  withPPARate,
} from './ppa';
