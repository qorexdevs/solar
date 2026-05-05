import type { Estimate } from '@/types';
import { computeEstimate, type ComputedResults } from './compute';

/**
 * Highest extra monthly prepayment that keeps loan-active cash flow >= 0.
 */
export function maxMonthlyPrepayment(
  estimate: Estimate | undefined,
  equityPctOverride: number | null
): number {
  if (!estimate || !estimate.finance?.enabled) return 0;

  const { financing } = estimate.finance;
  const grace = Math.min(
    Math.max(0, Math.floor(financing.gracePeriodYears)),
    financing.termYears
  );
  if (financing.termYears - grace <= 0) return 0;

  const compute = (extra: number): ComputedResults =>
    computeEstimate(estimate, {
      financedPctOverride:
        equityPctOverride !== null ? 100 - equityPctOverride : undefined,
      extraAnnualPrincipal: extra > 0 ? extra : undefined,
    });

  const baseline = compute(0);
  const loanAmount = baseline.finance?.loanAmount ?? 0;
  if (loanAmount <= 0) return 0;

  const seed = minActiveCashFlow(baseline);
  if (!Number.isFinite(seed) || seed <= 0) return 0;

  let extraAnnual = seed;
  for (let iter = 0; iter < 6; iter++) {
    const m = minActiveCashFlow(compute(extraAnnual));
    if (!Number.isFinite(m)) break;
    if (m < 1) break;
    extraAnnual += m;
  }

  const cappedAnnual = Math.min(extraAnnual, loanAmount);
  return Math.max(0, Math.floor(cappedAnnual / 12));
}

function minActiveCashFlow(r: ComputedResults): number {
  if (!r.finance) return Infinity;

  let min = Infinity;
  for (let i = 0; i < r.finance.loan.length; i++) {
    if (r.finance.loan[i].principal > 1e-6 && r.finance.cashflows[i] < min) {
      min = r.finance.cashflows[i];
    }
  }
  return min;
}
