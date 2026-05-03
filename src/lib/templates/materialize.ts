import type {
  EstimateTotals,
  MaterializedLine,
  MaterializedScopeLine,
} from '@/types';

/**
 * Sum a materialized BOM to PRD §7 totals. Pure; safe to call from the UI
 * to recompute live without re-running the composer.
 */
export function computeTotals(
  mainLines: MaterializedLine[],
  otherLines: MaterializedScopeLine[],
  targetCapacityKW: number
): EstimateTotals {
  let mainBomSubtotal = 0;
  let mainBomGst = 0;
  for (const line of mainLines) {
    if (!line.included) continue;
    mainBomSubtotal += line.subtotal;
    mainBomGst += line.gst;
  }

  let otherScopeSubtotal = 0;
  let otherScopeGst = 0;
  for (const line of otherLines) {
    if (!line.included) continue;
    otherScopeSubtotal += line.amount;
    otherScopeGst += line.gst;
  }

  const grandTotal =
    round2(mainBomSubtotal) +
    round2(mainBomGst) +
    round2(otherScopeSubtotal) +
    round2(otherScopeGst);

  const perKwRate = targetCapacityKW > 0 ? grandTotal / targetCapacityKW : 0;

  return {
    mainBomSubtotal: round2(mainBomSubtotal),
    mainBomGst: round2(mainBomGst),
    otherScopeSubtotal: round2(otherScopeSubtotal),
    otherScopeGst: round2(otherScopeGst),
    grandTotal: round2(grandTotal),
    perKwRate: round2(perKwRate),
  };
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
