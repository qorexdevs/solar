import { describe, expect, it } from 'vitest';
import { computeEstimate } from '@/lib/calc';
import { createEstimate, recomputeMaterialization } from './factory';
import {
  seedTemplates,
  SEED_TEMPLATE_ID_HT,
} from '../templates';

const HT = seedTemplates().find((t) => t.id === SEED_TEMPLATE_ID_HT)!;

/**
 * End-to-end smoke test that mirrors what the EstimateBuilder UI does:
 *   1. user picks a template and we create a default estimate at base capacity,
 *   2. user drags the target-capacity slider and we re-materialise,
 *   3. user toggles an optional Main BOM line and totals respond,
 *   4. enabling finance starts producing IRR/NPV; disabling stops.
 *
 * Catches regressions where any of these store/calc seams disagree.
 */
describe('estimate builder pipeline (smoke)', () => {
  it('materialise → resize → toggle option → compute', () => {
    const initial = createEstimate({ template: HT });
    expect(initial.targetCapacityKW).toBe(HT.baseCapacityKW);
    expect(initial.totals.grandTotal).toBeGreaterThan(0);

    // Step 1: resize down — totals should drop.
    const halved = recomputeMaterialization(
      { ...initial, targetCapacityKW: Math.round(HT.baseCapacityKW / 2) },
      HT
    );
    expect(halved.totals.grandTotal).toBeLessThan(initial.totals.grandTotal);

    // Step 2: toggle every optional Main BOM line off — total should not increase.
    const withoutOptional = recomputeMaterialization(
      {
        ...halved,
        selectedOptions: { mainBomLineIds: [], otherScopeIds: [] },
      },
      HT
    );
    expect(withoutOptional.totals.grandTotal).toBeLessThanOrEqual(
      halved.totals.grandTotal
    );

    // Step 3: compute without finance — finance block must be null.
    const bomOnly = computeEstimate(withoutOptional);
    expect(bomOnly.finance).toBeNull();
    expect(bomOnly.capex.total).toBeCloseTo(withoutOptional.totals.grandTotal, 0);

    // Step 4: enable finance and recompute — IRR should now be a finite number.
    const withFinance = computeEstimate({
      ...withoutOptional,
      finance: {
        enabled: true,
        basics: {
          lifespanYears: 25,
          cufPct: 22,
          degradationPct: 0.5,
          inflationPct: 6,
          discountPct: 10,
        },
        revenue: { ppaRate: 4, ppaEscalationPct: 2 },
        om: { percentOfCapex: 1, overrides: [] },
        financing: {
          financedPct: 70,
          interestPct: 9,
          termYears: 25,
          gracePeriodYears: 1,
        },
      },
    });
    expect(withFinance.finance).not.toBeNull();
    if (!withFinance.finance) return;
    expect(Number.isFinite(withFinance.finance.irr)).toBe(true);
    expect(withFinance.finance.pnl.length).toBe(25);
  });
});
