import { useMemo } from 'react';
import { maxMonthlyPrepayment } from '@/lib/calc';
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
  return useMemo(
    () => maxMonthlyPrepayment(estimate, equityPctOverride),
    [estimate, equityPctOverride]
  );
}
