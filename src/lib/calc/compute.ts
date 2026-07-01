import type {
  Estimate,
  EstimateBasics,
  EstimateFinancing,
  EstimateOM,
  EstimateRevenue,
  EstimateTotals,
  FinanceLayer,
  YieldResult,
} from '@/types';
import { simulateYield, snapToNearestCity } from '@/lib/irradiance';
import { capexBreakdown, type CapexBreakdown } from './capex';
import {
  cumulativeCF,
  equityMultiple,
  irr,
  mirr,
  npv,
  peakFundingNeed,
  profitabilityIndex,
  yearlyCashFlows,
} from './cashflow';
import {
  avgDSCR,
  dscrBreaches,
  dscrSeries,
  icrSeries,
  llcr,
  minDSCR,
  plcr,
} from './dscr';
import { lcoeFromSeries } from './lcoe';
import { co2Tonnes } from './co2';
import {
  annualEnergyKWh,
  annualEnergyKWhFromYield,
  yearlyEnergy,
  yearlyRevenue,
} from './energy';
import { loanAmountForEstimate, loanSchedule, type LoanRow } from './loan';
import { yearlyOM } from './om';
import { breakEvenYear, discountedPaybackYears, paybackYears } from './payback';

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

/**
 * Optional finance outputs. Present only when the estimate has
 * `finance.enabled === true`. The Results UI keys off `null` to hide the
 * cashflow / IRR / NPV / yield panels.
 */
export type FinanceResults = {
  loanAmount: number;
  equity: number;
  energy: number[];
  revenue: number[];
  om: number[];
  loan: LoanRow[];
  cashflows: number[];
  cumulativeCF: number[];
  npv: number;
  irr: number;
  /** Modified IRR at the discount rate, free of IRR's reinvestment bias. */
  mirr: number;
  profitabilityIndex: number;
  /** Total undiscounted cash returned to equity per rupee invested (MOIC). */
  equityMultiple: number;
  /** Deepest cumulative cash deficit over the life — peak capital tied up. */
  peakFundingNeed: number;
  /**
   * Per-year debt service coverage (null in years without debt service).
   * `breachYear`/`breachCount` flag years where DSCR drops below 1 — operations
   * short of that year's loan payment.
   */
  dscr: {
    series: Array<number | null>;
    min: number | null;
    avg: number | null;
    breachYear: number | null;
    breachCount: number;
  };
  /**
   * Per-year interest coverage (null once interest stops). `min` is the tightest
   * year — the interest-only floor lenders read alongside DSCR.
   */
  icr: {
    series: Array<number | null>;
    min: number | null;
  };
  /** Loan life coverage ratio over the whole loan (null when unfinanced). */
  llcr: number | null;
  /** Project life coverage ratio over the full plant life (null when unfinanced). */
  plcr: number | null;
  /** Levelized cost of energy in ₹/kWh over the lifetime. */
  lcoe: number;
  paybackYears: number | null;
  discountedPaybackYears: number | null;
  breakEvenYear: number | null;
  co2: { annualYear1: number; cumulative: number; yearly: number[] };
  pnl: PnLRow[];
  yield: YieldResult | null;
  effectiveCufPct: number;
  meta: {
    basics: EstimateBasics;
    revenue: EstimateRevenue;
    om: EstimateOM;
    financing: EstimateFinancing;
  };
};

export type ComputedResults = {
  /** Always present — derived from the estimate's materialized BOM. */
  capex: CapexBreakdown;
  /** Always present — PRD §7 totals copied from the estimate. */
  totals: EstimateTotals;
  /** Present only when `estimate.finance?.enabled` is true. */
  finance: FinanceResults | null;
};

/**
 * What-if overrides applied on top of a saved estimate without mutating it.
 * Used by the Results dashboard for live sliders (equity split, prepayment).
 */
export type EstimateOverrides = {
  financedPctOverride?: number;
  extraAnnualPrincipal?: number;
  /** Auto-absorb every year's surplus into extra principal. */
  autoAbsorbSurplus?: boolean;
};

export function computeEstimate(
  estimate: Estimate,
  overrides: EstimateOverrides = {}
): ComputedResults {
  const capex = capexBreakdown(estimate.materialized);

  if (!estimate.finance?.enabled) {
    return { capex, totals: estimate.totals, finance: null };
  }

  const finance = computeFinance(estimate, capex, estimate.finance, overrides);
  return { capex, totals: estimate.totals, finance };
}

function computeFinance(
  estimate: Estimate,
  capex: CapexBreakdown,
  layer: FinanceLayer,
  overrides: EstimateOverrides
): FinanceResults {
  const { basics, revenue: rev, om: omCfg, financing } = layer;
  const sizeMW = estimate.targetCapacityKW / 1000;

  const effectiveFinancing: EstimateFinancing =
    overrides.financedPctOverride !== undefined
      ? {
          ...financing,
          financedPct: Math.max(0, Math.min(100, overrides.financedPctOverride)),
          manualLoanAmount: undefined,
        }
      : financing;

  const loanAmount = loanAmountForEstimate(capex.total, effectiveFinancing);
  const equity = Math.max(0, capex.total - loanAmount);

  // When a location is pinned, drive baseline energy from the yield model;
  // otherwise fall back to the flat cufPct path so legacy estimates work.
  let yieldResult: YieldResult | null = null;
  let effectiveCufPct = basics.cufPct;
  if (estimate.location) {
    const snap = snapToNearestCity(estimate.location.lat, estimate.location.lng);
    if (snap) {
      yieldResult = simulateYield({
        location: estimate.location,
        record: snap.record,
      });
      effectiveCufPct = yieldResult.impliedCufPct;
    }
  }

  const baseEnergy = yieldResult
    ? annualEnergyKWhFromYield(sizeMW, yieldResult.annualSpecificYield)
    : annualEnergyKWh(sizeMW, basics.cufPct);
  const energy = yearlyEnergy(basics.lifespanYears, baseEnergy, basics.degradationPct);
  const revenueArr = yearlyRevenue(energy, rev.ppaRate, rev.ppaEscalationPct);

  const omBaseAnnual = (capex.total * (omCfg.percentOfCapex ?? 0)) / 100;
  const omArr = yearlyOM(
    basics.lifespanYears,
    omBaseAnnual,
    basics.inflationPct,
    omCfg.overrides
  );

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
      if (yearNum <= grace) continue;
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
  const dscr = dscrSeries(
    revenueArr,
    omArr,
    loan.map((r) => r.payment)
  );

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
    mirr: mirr(cashflows, equity, basics.discountPct),
    profitabilityIndex: profitabilityIndex(cashflows, basics.discountPct, equity),
    equityMultiple: equityMultiple(cashflows, equity),
    peakFundingNeed: peakFundingNeed(cumCF),
    dscr: (() => {
      const breaches = dscrBreaches(dscr, 1);
      return {
        series: dscr,
        min: minDSCR(dscr),
        avg: avgDSCR(dscr),
        breachYear: breaches.first,
        breachCount: breaches.count,
      };
    })(),
    icr: (() => {
      const series = icrSeries(
        revenueArr,
        omArr,
        loan.map((r) => r.interest)
      );
      return { series, min: minDSCR(series) };
    })(),
    llcr: llcr(
      revenueArr,
      omArr,
      loanAmount,
      effectiveFinancing.interestPct,
      effectiveFinancing.termYears
    ),
    plcr: plcr(revenueArr, omArr, loanAmount, effectiveFinancing.interestPct),
    lcoe: lcoeFromSeries(capex.total, omArr, energy, basics.discountPct),
    paybackYears: paybackYears(cumCF),
    discountedPaybackYears: discountedPaybackYears(cashflows, equity, basics.discountPct),
    breakEvenYear: breakEvenYear(cumCF),
    co2: {
      annualYear1: co2.yearly[0] ?? 0,
      cumulative: co2.cumulative,
      yearly: co2.yearly,
    },
    pnl,
    yield: yieldResult,
    effectiveCufPct,
    meta: { basics, revenue: rev, om: omCfg, financing },
  };
}
