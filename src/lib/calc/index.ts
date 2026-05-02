/**
 * Solar plant feasibility calc engine.
 *
 * Public surface re-exported here so consumers can keep importing from
 * `@/lib/calc`. Internal modules (energy, om, capex, …) split the engine
 * by concept; see [docs/architecture.md](../../../docs/architecture.md) for
 * the data-flow tour.
 */
export { capexBreakdown, type CapexBreakdown } from './capex';
export { cumulativeCF, irr, npv, yearlyCashFlows } from './cashflow';
export { CO2_FACTOR_KG_PER_KWH, co2Tonnes } from './co2';
export {
  computeScenario,
  type ComputedResults,
  type PnLRow,
  type ScenarioOverrides,
} from './compute';
export { annualEnergyKWh, yearlyEnergy, yearlyRevenue } from './energy';
export { loanAmountForScenario, loanSchedule, type LoanRow } from './loan';
export { yearlyOM } from './om';
export { breakEvenYear, paybackYears } from './payback';
