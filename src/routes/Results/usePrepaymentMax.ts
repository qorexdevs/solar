import { useMemo } from 'react';
import { computeScenario, type ComputedResults } from '@/lib/calc';
import type { Scenario } from '@/types';

/**
 * Cap the monthly prepayment so no post-grace, loan-active year's Net CF
 * is pushed negative. The naive answer (baseline minCF / 12) undershoots
 * because applying extra principal retires the loan earlier — so the
 * baseline's worst year may no longer have a loan payment, and a different
 * year becomes the new bottleneck. We iterate to a fixed point: each pass
 * adds back the unused headroom until min loan-active CF ≈ 0.
 */
export function usePrepaymentMax(
  scenario: Scenario | undefined,
  equityPctOverride: number | null
): number {
  return useMemo(() => {
    if (!scenario) return 0;
    const compute = (extra: number) =>
      computeScenario(scenario, {
        financedPctOverride:
          equityPctOverride !== null ? 100 - equityPctOverride : undefined,
        extraAnnualPrincipal: extra > 0 ? extra : undefined,
      });
    const minActiveCF = (r: ComputedResults) => {
      let m = Infinity;
      for (let i = 0; i < r.loan.length; i++) {
        if (r.loan[i].principal > 1e-6 && r.cashflows[i] < m) {
          m = r.cashflows[i];
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
  }, [scenario, equityPctOverride]);
}
