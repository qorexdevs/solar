import type { Estimate } from '@/types';
import { computeEstimate } from './compute';

/**
 * Indexation modes for the PPA tariff schedule.
 *
 * - `none`: PPA escalates at the contractual `escalationPct` only.
 * - `cpi`: A simple consumer-price-index pass-through, used as a partial hedge
 *   against inflation.
 */
export type Indexation =
  | { kind: 'none' }
  | { kind: 'cpi'; cpiFraction: number };

export type PPASolveArgs = {
  estimate: Estimate;
  /** Total contract length in years; capped at estimate lifespan. */
  termYears: number;
  /** Annual contractual escalation, e.g. 1.5 means +1.5% / yr. */
  escalationPct: number;
  /** Optional inflation pass-through. */
  indexation: Indexation;
  /** Equity IRR target, expressed as a fraction (0.15 = 15%). */
  targetIRR: number;
};

export type PPASolveResult = {
  baseRate: number;
  /** Year-by-year tariff (₹/kWh) the user sees on the term sheet. */
  schedule: number[];
  /** Achieved equity IRR at the solved rate (should ≈ targetIRR). */
  achievedIRR: number;
  /** True when bisection converged within tolerance. */
  converged: boolean;
};

/**
 * Solve for the year-1 PPA rate that drives equity IRR to the user's target.
 * Requires the estimate to have a finance layer enabled; otherwise returns
 * a zero solution.
 */
export function solvePPARate(args: PPASolveArgs): PPASolveResult {
  const { estimate, termYears, escalationPct, indexation, targetIRR } = args;

  if (!estimate.finance?.enabled) {
    return { baseRate: 0, schedule: [], achievedIRR: NaN, converged: false };
  }

  const inflationPct = estimate.finance.basics.inflationPct;

  const trial = (rate: number): number => {
    const variant = withPPARate(estimate, rate, escalationPct, indexation);
    const r = computeEstimate(variant);
    return r.finance && Number.isFinite(r.finance.irr) ? r.finance.irr : -1;
  };

  let lo = 0.1;
  let hi = 25.0;
  let fLo = trial(lo) - targetIRR;
  let fHi = trial(hi) - targetIRR;

  let attempts = 0;
  while (fLo * fHi > 0 && attempts < 6) {
    hi *= 2;
    fHi = trial(hi) - targetIRR;
    attempts += 1;
  }

  let baseRate = (lo + hi) / 2;
  let converged = false;
  if (fLo * fHi <= 0) {
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      const fMid = trial(mid) - targetIRR;
      if (Math.abs(fMid) < 1e-4 || hi - lo < 1e-4) {
        baseRate = mid;
        converged = true;
        break;
      }
      if (fLo * fMid <= 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
      baseRate = mid;
    }
  } else {
    baseRate = Math.abs(fLo) < Math.abs(fHi) ? lo : hi;
  }

  const schedule = tariffSchedule({
    baseRate,
    termYears,
    escalationPct,
    indexation,
    inflationPct,
  });
  const achievedIRR = trial(baseRate);

  return { baseRate, schedule, achievedIRR, converged };
}

/**
 * Year-by-year tariff schedule.
 */
export function tariffSchedule(args: {
  baseRate: number;
  termYears: number;
  escalationPct: number;
  indexation: Indexation;
  /** Required when `indexation.kind === 'cpi'`. */
  inflationPct?: number;
}): number[] {
  const { baseRate, termYears, escalationPct, indexation, inflationPct = 0 } = args;
  const e = 1 + escalationPct / 100;
  const cpiFactor =
    indexation.kind === 'cpi' ? 1 + (indexation.cpiFraction * inflationPct) / 100 : 1;
  const out: number[] = new Array(termYears);
  for (let i = 0; i < termYears; i++) {
    out[i] = baseRate * Math.pow(e, i) * Math.pow(cpiFactor, i);
  }
  return out;
}

/**
 * Clone an estimate with a different year-1 PPA tariff and (optionally) a
 * different annual escalation. Useful for what-if PPA analyses without
 * mutating the saved estimate.
 *
 * When `indexation.kind === 'cpi'` the supplied escalation is combined with
 * the inflation pass-through to yield a single effective escalation, matching
 * the behavior of the PPA solver.
 *
 * No-ops on estimates without an enabled finance layer.
 */
export function withPPARate(
  estimate: Estimate,
  baseRate: number,
  escalationPct: number,
  indexation: Indexation = { kind: 'none' }
): Estimate {
  if (!estimate.finance?.enabled) return estimate;
  const inflationPct = estimate.finance.basics.inflationPct;
  const combined =
    indexation.kind === 'cpi'
      ? (1 + escalationPct / 100) *
          (1 + (indexation.cpiFraction * inflationPct) / 100) -
        1
      : escalationPct / 100;
  const effectiveEscalationPct = combined * 100;

  return {
    ...estimate,
    finance: {
      ...estimate.finance,
      revenue: {
        ...estimate.finance.revenue,
        ppaRate: baseRate,
        ppaEscalationPct: effectiveEscalationPct,
      },
    },
  };
}
