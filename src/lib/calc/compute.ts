import type {
  Scenario,
  ScenarioBasics,
  ScenarioFinancing,
  ScenarioOM,
  ScenarioRevenue,
} from '@/types';
import { capexBreakdown, type CapexBreakdown } from './capex';
import { cumulativeCF, irr, npv, yearlyCashFlows } from './cashflow';
import { co2Tonnes } from './co2';
import { annualEnergyKWh, yearlyEnergy, yearlyRevenue } from './energy';
import { loanAmountForScenario, loanSchedule, type LoanRow } from './loan';
import { yearlyOM } from './om';
import { breakEvenYear, paybackYears } from './payback';

export type PnLRow = {
  year: number;
  energyKWh: number;
  revenue: number;
  om: number;
  interest: number;
  principal: number;
  loanPayment: number;
  loanBalance: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
};

export type ComputedResults = {
  capex: CapexBreakdown;
  loanAmount: number;
  equity: number;
  energy: number[]; // kWh per year
  revenue: number[]; // ₹ per year
  om: number[]; // ₹ per year
  loan: LoanRow[];
  cashflows: number[]; // post-equity, year 1..n
  cumulativeCF: number[];
  npv: number;
  irr: number; // fraction (e.g. 0.155 = 15.5%)
  paybackYears: number | null;
  breakEvenYear: number | null;
  co2: { annualYear1: number; cumulative: number; yearly: number[] };
  pnl: PnLRow[];
  meta: {
    basics: ScenarioBasics;
    revenue: ScenarioRevenue;
    om: ScenarioOM;
    financing: ScenarioFinancing;
  };
};

/**
 * What-if overrides applied on top of a saved scenario without mutating it.
 * Used by the Results dashboard for live sliders (equity split, prepayment).
 */
export type ScenarioOverrides = {
  /** If set, replaces `financing.financedPct` and ignores any manualLoanAmount. */
  financedPctOverride?: number;
  /** Additional principal payment per year (post-grace). Retires loan earlier. */
  extraAnnualPrincipal?: number;
  /**
   * When true, dynamically computes the extra principal each post-grace year
   * to absorb that year's full available cash flow (revenue − O&M − scheduled
   * loan payment). Net CF in those years becomes ≈ 0 and the loan is retired
   * as quickly as the project's surplus allows. Takes precedence over
   * `extraAnnualPrincipal`.
   */
  autoAbsorbSurplus?: boolean;
};

export function computeScenario(
  scenario: Scenario,
  overrides: ScenarioOverrides = {}
): ComputedResults {
  const { basics, materials, revenue: rev, om: omCfg, financing } = scenario;

  const capex = capexBreakdown(materials);

  const effectiveFinancing: ScenarioFinancing =
    overrides.financedPctOverride !== undefined
      ? {
          ...financing,
          financedPct: Math.max(0, Math.min(100, overrides.financedPctOverride)),
          manualLoanAmount: undefined,
        }
      : financing;

  const loanAmount = loanAmountForScenario(capex.total, effectiveFinancing);
  const equity = Math.max(0, capex.total - loanAmount);

  const baseEnergy = annualEnergyKWh(basics.sizeMW, basics.cufPct);
  const energy = yearlyEnergy(basics.lifespanYears, baseEnergy, basics.degradationPct);
  const revenueArr = yearlyRevenue(energy, rev.ppaRate, rev.ppaEscalationPct);
  // O&M Year-1 base derives from the catalog's % of CAPEX so material edits or
  // re-pricing flow through to operating costs without a manual resync.
  const omBaseAnnual = (capex.total * (omCfg.percentOfCapex ?? 0)) / 100;
  const omArr = yearlyOM(
    basics.lifespanYears,
    omBaseAnnual,
    basics.inflationPct,
    omCfg.overrides
  );
  // When autoAbsorbSurplus is on, simulate the loan year-by-year to derive
  // each year's extra principal as the available surplus. We mirror the same
  // annuity math used inside `loanSchedule` so the schedule that consumes the
  // resulting array stays self-consistent.
  let extraByYear: number[] | undefined;
  if (overrides.autoAbsorbSurplus && loanAmount > 0) {
    const rate = effectiveFinancing.interestPct / 100;
    const grace = Math.min(
      Math.max(0, Math.floor(effectiveFinancing.gracePeriodYears)),
      effectiveFinancing.termYears
    );
    const repaymentYears = effectiveFinancing.termYears - grace;
    const annuity =
      repaymentYears > 0
        ? rate === 0
          ? loanAmount / repaymentYears
          : (loanAmount * rate) / (1 - Math.pow(1 + rate, -repaymentYears))
        : 0;
    extraByYear = new Array(basics.lifespanYears).fill(0);
    let bal = loanAmount;
    for (let i = 0; i < basics.lifespanYears; i++) {
      const yearNum = i + 1;
      if (yearNum <= grace) {
        // Interest-only during grace; no extra principal allowed (matches loanSchedule).
        continue;
      }
      if (yearNum > effectiveFinancing.termYears || bal <= 1e-6) break;
      const interest = bal * rate;
      const scheduled = Math.min(annuity - interest, bal);
      const remaining = Math.max(0, bal - scheduled);
      const surplus = revenueArr[i] - omArr[i] - (interest + scheduled);
      const extra = Math.max(0, Math.min(surplus, remaining));
      extraByYear[i] = extra;
      bal = Math.max(0, bal - scheduled - extra);
    }
  }

  const loan = loanSchedule(
    {
      principal: loanAmount,
      ratePct: effectiveFinancing.interestPct,
      termYears: effectiveFinancing.termYears,
      gracePeriodYears: effectiveFinancing.gracePeriodYears,
      extraAnnualPrincipal: overrides.autoAbsorbSurplus
        ? undefined
        : overrides.extraAnnualPrincipal,
      extraByYear,
    },
    basics.lifespanYears
  );
  const cashflows = yearlyCashFlows(
    revenueArr,
    omArr,
    loan.map((r) => r.payment)
  );
  const cumCF = cumulativeCF(cashflows, equity);
  const co2 = co2Tonnes(energy);

  const pnl: PnLRow[] = [];
  for (let i = 0; i < basics.lifespanYears; i++) {
    pnl.push({
      year: i + 1,
      energyKWh: energy[i],
      revenue: revenueArr[i],
      om: omArr[i],
      interest: loan[i].interest,
      principal: loan[i].principal,
      loanPayment: loan[i].payment,
      loanBalance: loan[i].balance,
      netCashFlow: cashflows[i],
      cumulativeCashFlow: cumCF[i],
    });
  }

  return {
    capex,
    loanAmount,
    equity,
    energy,
    revenue: revenueArr,
    om: omArr,
    loan,
    cashflows,
    cumulativeCF: cumCF,
    npv: npv(cashflows, basics.discountPct, equity),
    irr: irr(cashflows, equity),
    paybackYears: paybackYears(cumCF),
    breakEvenYear: breakEvenYear(cumCF),
    co2: {
      annualYear1: co2.yearly[0] ?? 0,
      cumulative: co2.cumulative,
      yearly: co2.yearly,
    },
    pnl,
    meta: { basics, revenue: rev, om: omCfg, financing },
  };
}
