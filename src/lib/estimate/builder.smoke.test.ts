import { describe, expect, it } from 'vitest';
import { computeEstimate } from '@/lib/calc';
import {
  createEstimate,
  defaultSelectionsFromFacets,
  recomputeMaterialization,
} from './factory';
import { seedTemplates } from '@/lib/templates';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';

/**
 * End-to-end smoke: create default-composed estimate → resize → strip optional picks → finance.
 */
describe('estimate builder pipeline (smoke)', () => {
  it('materialise → resize → toggle option → compute', () => {
    const facets = seedFacets();
    const templates = seedTemplates();
    const catalogItems = seedMaterialCatalog();
    const templatesById = new Map(templates.map((t) => [t.id, t]));
    const selections = defaultSelectionsFromFacets(facets, templatesById);

    const initial = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
    });
    expect(initial.totals.grandTotal).toBeGreaterThan(0);

    const host = templates.find((t) =>
      t.lines.some((l) => l.isOptional || l.scalingType === 'optional')
    );
    expect(host).toBeDefined();
    const nextOpts = initial.selectedOptionsPerTemplate[host!.id]?.lineIds?.length
      ? { ...initial.selectedOptionsPerTemplate, [host!.id]: { lineIds: [] } }
      : initial.selectedOptionsPerTemplate;

    const resized = recomputeMaterialization(
      {
        ...initial,
        targetCapacityKW: Math.min(350, Math.max(250, Math.round(initial.targetCapacityKW * 0.35))),
        selectedOptionsPerTemplate: nextOpts,
      },
      { facets, templates, catalogItems }
    );
    expect(resized.targetCapacityKW).toBeLessThan(initial.targetCapacityKW);
    expect(resized.totals.grandTotal).toBeLessThanOrEqual(initial.totals.grandTotal);

    const bomOnly = computeEstimate(resized);
    expect(bomOnly.finance).toBeNull();
    expect(bomOnly.capex.total).toBeCloseTo(resized.totals.grandTotal, 0);

    const withFinance = computeEstimate({
      ...resized,
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
