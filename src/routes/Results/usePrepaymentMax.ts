import { useMemo } from 'react';
import { computeEstimate, type ComputedResults } from '@/lib/calc';
import type { Estimate } from '@/types';

/**
 * Cap the monthly prepayment so no post-grace, loan-active year's Net CF
 * is pushed negative. Iterates to a fixed point. Returns 0 when the
 * estimate has no enabled finance layer.
 */
export function usePrepaymentMax(
  estimate: Estimate | undefined,
  equityPctOverride: number | null
): number {
  return useMemo(() => {
    if (!estimate || !estimate.finance?.enabled) return 0;
    const compute = (extra: number) =>
      computeEstimate(estimate, {
        financedPctOverride:
          equityPctOverride !== null ? 100 - equityPctOverride : undefined,
        extraAnnualPrincipal: extra > 0 ? extra : undefined,
      });
    const minActiveCF = (r: ComputedResults) => {
      if (!r.finance) return Infinity;
      let m = Infinity;
      for (let i = 0; i < r.finance.loan.length; i++) {
        if (r.finance.loan[i].principal > 1e-6 && r.finance.cashflows[i] < m) {
          m = r.finance.cashflows[i];
        }
      }
      return m;
    };

    const seed = minActiveCF(compute(0));
    if (!Number.isFinite(seed) || seed <= 0) return 0;
    let extraAnnual = seed;
    for (let iter = 0; iter < 6; iter++) {
      const m = minActiveCF(compute(extraAnnual));
      if (!Number.isFinite(m)) break;
      if (m < 1) break;
      extraAnnual += m;
    }
    return Math.max(0, Math.floor(extraAnnual / 12));
  }, [estimate, equityPctOverride]);
}
