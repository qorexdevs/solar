import { describe, expect, it } from 'vitest';
import { lcoeINRPerKWh } from '@/lib/calc';
import { createEstimate, defaultFinanceLayer, defaultSelectionsFromFacets } from '@/lib/estimate';
import { seedTemplates } from '@/lib/templates';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';
import { evaluateScenarios, seedScenarios, type RateScenario } from './ppaRates';

function makeEstimate() {
  const facets = seedFacets();
  const templates = seedTemplates();
  const catalogItems = seedMaterialCatalog();
  const byId = new Map(templates.map((t) => [t.id, t]));
  return createEstimate({
    facets,
    templates,
    catalogItems,
    selections: defaultSelectionsFromFacets(facets, byId),
    targetCapacityKW: 1000,
    finance: { ...defaultFinanceLayer(true) },
  });
}

describe('seedScenarios', () => {
  it('produces three rates around the estimate\'s current PPA', () => {
    const est = makeEstimate();
    const base = est.finance!.revenue.ppaRate;
    const seeded = seedScenarios(est);
    expect(seeded).toHaveLength(3);
    expect(seeded[0].ppaRate).toBeLessThan(base);
    expect(seeded[1].ppaRate).toBeCloseTo(base, 2);
    expect(seeded[2].ppaRate).toBeGreaterThan(base);
    for (const s of seeded) {
      expect(s.escalationPct).toBeCloseTo(
        est.finance!.revenue.ppaEscalationPct,
        6
      );
    }
  });
});

describe('evaluateScenarios', () => {
  it('returns one result per scenario, each with finance', () => {
    const est = makeEstimate();
    const out = evaluateScenarios(est, seedScenarios(est));
    expect(out).toHaveLength(3);
    for (const r of out) {
      expect(r.results.finance).not.toBeNull();
    }
  });

  it('IRR is monotonically non-decreasing as PPA rate increases', () => {
    const est = makeEstimate();
    const escalation = est.finance!.revenue.ppaEscalationPct;
    const scenarios: RateScenario[] = [3.0, 4.0, 5.0, 6.0, 7.0].map((r, i) => ({
      id: `r${i}`,
      ppaRate: r,
      escalationPct: escalation,
    }));
    const out = evaluateScenarios(est, scenarios);
    const irrs = out.map((r) => r.results.finance!.irr);
    for (let i = 1; i < irrs.length; i++) {
      expect(irrs[i]).toBeGreaterThan(irrs[i - 1]);
    }
  });

  it('NPV \u2248 0 when the PPA rate equals LCOE (using zero escalation to match LCOE assumptions)', () => {
    const est = makeEstimate();
    const lcoe = lcoeINRPerKWh(est);
    expect(Number.isFinite(lcoe)).toBe(true);
    const out = evaluateScenarios(est, [
      { id: 'lcoe', ppaRate: lcoe, escalationPct: 0 },
    ]);
    const npv = out[0].results.finance!.npv;
    // LCOE neutralises lifecycle costs at the discount rate, but the finance
    // engine layers a debt schedule on top, so we only require the result to
    // sit close to break-even relative to the project's CAPEX.
    const capex = out[0].results.capex.total;
    expect(Math.abs(npv) / capex).toBeLessThan(0.05);
  });

  it('does not mutate the source estimate', () => {
    const est = makeEstimate();
    const before = est.finance!.revenue.ppaRate;
    evaluateScenarios(est, [
      { id: 'a', ppaRate: 99, escalationPct: 0 },
    ]);
    expect(est.finance!.revenue.ppaRate).toBe(before);
  });
});
