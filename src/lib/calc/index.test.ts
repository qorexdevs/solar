import { describe, expect, it } from 'vitest';
import {
  annualEnergyKWh,
  breakEvenYear,
  capexBreakdown,
  co2Tonnes,
  computeEstimate,
  cumulativeCF,
  irr,
  lcoeINRPerKWh,
  loanSchedule,
  npv,
  paybackYears,
  solvePPARate,
  tariffSchedule,
  withPPARate,
  yearlyCashFlows,
  yearlyEnergy,
  yearlyOM,
  yearlyRevenue,
} from '.';
import type { ComposeMode, MaterializedBOM } from '@/types';
import {
  createEstimate,
  defaultFinanceLayer,
  defaultSelectionsFromFacets,
} from '../estimate';
import { seedTemplates } from '../templates';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';

function testEstimate(partial?: {
  targetCapacityKW?: number;
  finance?: ReturnType<typeof defaultFinanceLayer>;
}) {
  const facets = seedFacets();
  const templates = seedTemplates();
  const catalogItems = seedMaterialCatalog();
  return createEstimate({
    facets,
    templates,
    catalogItems,
    selections: defaultSelectionsFromFacets(
      facets,
      new Map(templates.map((t) => [t.id, t]))
    ),
    targetCapacityKW: partial?.targetCapacityKW,
    finance: partial?.finance,
  });
}

/* ------------------------------------------------------------------------ */
/* Pure helpers                                                              */
/* ------------------------------------------------------------------------ */

describe('annualEnergyKWh', () => {
  it('matches PRD formula: capacity_kW × CUF × 8760', () => {
    expect(annualEnergyKWh(1, 20)).toBeCloseTo(1000 * 0.2 * 8760, 6);
  });
  it('scales linearly with size', () => {
    expect(annualEnergyKWh(2, 20)).toBeCloseTo(2 * annualEnergyKWh(1, 20), 6);
  });
});

describe('yearlyEnergy', () => {
  it('applies geometric degradation', () => {
    const out = yearlyEnergy(3, 1000, 1);
    expect(out).toHaveLength(3);
    expect(out[0]).toBeCloseTo(1000, 6);
    expect(out[1]).toBeCloseTo(990, 6);
    expect(out[2]).toBeCloseTo(980.1, 6);
  });
  it('with 0% degradation returns flat array', () => {
    const out = yearlyEnergy(5, 100, 0);
    expect(out.every((v) => v === 100)).toBe(true);
  });
});

describe('yearlyRevenue', () => {
  it('escalates revenue per PPA escalation', () => {
    const energy = [100, 100, 100];
    const out = yearlyRevenue(energy, 5, 10);
    expect(out[0]).toBeCloseTo(500, 6);
    expect(out[1]).toBeCloseTo(550, 6);
    expect(out[2]).toBeCloseTo(605, 6);
  });
});

describe('yearlyOM', () => {
  it('inflates O&M annually', () => {
    const out = yearlyOM(3, 1000, 5, []);
    expect(out[0]).toBeCloseTo(1000, 6);
    expect(out[1]).toBeCloseTo(1050, 6);
    expect(out[2]).toBeCloseTo(1102.5, 6);
  });
  it('overrides replace inflated values for a specific year', () => {
    const out = yearlyOM(3, 1000, 5, [{ year: 2, amount: 9999 }]);
    expect(out[0]).toBeCloseTo(1000, 6);
    expect(out[1]).toBe(9999);
    expect(out[2]).toBeCloseTo(1102.5, 6);
  });
});

/* ------------------------------------------------------------------------ */
/* CAPEX over MaterializedBOM                                                */
/* ------------------------------------------------------------------------ */

describe('capexBreakdown', () => {
  it('rolls up subtotals per category and applies per-line GST', () => {
    const bom: MaterializedBOM = {
      mainLines: [
        {
          id: 'l1',
          catalogItemId: 'l1',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceLineIds: ['l1'],
          sourceLineId: 'l1',
          sequence: 1,
          category: 'modules',
          itemName: 'Modules',
          description: '',
          uom: 'count',
          scalingType: 'fixed',
          quantity: 100,
          rate: 7290,
          gstPercent: 12,
          subtotal: 729000,
          gst: 87480,
          total: 816480,
          included: true,
          applicabilityFiltered: false,
          userExcluded: false,
        },
        {
          id: 'l2',
          catalogItemId: 'l2',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceLineIds: ['l2'],
          sourceLineId: 'l2',
          sequence: 2,
          category: 'cables',
          itemName: 'DC Cable',
          description: '',
          uom: 'meter',
          scalingType: 'linear',
          quantity: 1000,
          rate: 52,
          gstPercent: 18,
          subtotal: 52000,
          gst: 9360,
          total: 61360,
          included: true,
          applicabilityFiltered: false,
          userExcluded: false,
        },
      ],
      otherLines: [
        {
          id: 'cu1',
          catalogItemId: 'cu1',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceItemIds: ['cu1'],
          sourceItemId: 'cu1',
          sequence: 1,
          scopeName: 'Permitting',
          scalingType: 'fixed',
          amount: 50000,
          gstPercent: 0,
          gst: 0,
          total: 50000,
          included: true,
          applicabilityFiltered: false,
          userExcluded: false,
        },
      ],
    };
    const r = capexBreakdown(bom);
    expect(r.mainSubtotal).toBe(729000 + 52000);
    expect(r.otherSubtotal).toBe(50000);
    expect(r.subtotal).toBe(729000 + 52000 + 50000);
    expect(r.tax).toBeCloseTo(87480 + 9360, 4);
    expect(r.total).toBeCloseTo(r.subtotal + r.tax, 4);
    expect(r.byCategory.modules.subtotal).toBe(729000);
    expect(r.byCategory.cables.subtotal).toBe(52000);
    expect(r.byCategory.__other_scope__.subtotal).toBe(50000);
  });

  it('honours the included flag', () => {
    const bom: MaterializedBOM = {
      mainLines: [
        {
          id: 'l1',
          catalogItemId: 'l1',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceLineIds: ['l1'],
          sourceLineId: 'l1',
          sequence: 1,
          category: 'switchyard',
          itemName: 'HT Yard',
          description: '',
          uom: 'count',
          scalingType: 'conditional',
          quantity: 0,
          rate: 500000,
          gstPercent: 18,
          subtotal: 0,
          gst: 0,
          total: 0,
          included: false,
          applicabilityFiltered: true,
          userExcluded: false,
        },
      ],
      otherLines: [],
    };
    const r = capexBreakdown(bom);
    expect(r.total).toBe(0);
    expect(r.byCategory.switchyard.subtotal).toBe(0);
  });
});

/* ------------------------------------------------------------------------ */
/* Loan / cashflow / IRR / NPV                                               */
/* ------------------------------------------------------------------------ */

describe('loanSchedule', () => {
  it('zero principal returns all-zero rows', () => {
    const rows = loanSchedule(
      { principal: 0, ratePct: 10, termYears: 5, gracePeriodYears: 0 },
      5
    );
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.payment === 0 && r.balance === 0)).toBe(true);
  });

  it('zero-rate loan splits principal evenly', () => {
    const rows = loanSchedule(
      { principal: 1000, ratePct: 0, termYears: 5, gracePeriodYears: 0 },
      5
    );
    expect(rows.map((r) => r.payment)).toEqual([200, 200, 200, 200, 200]);
    expect(rows[4].balance).toBe(0);
  });

  it('grace period: interest-only then annuity', () => {
    const rows = loanSchedule(
      { principal: 1000, ratePct: 10, termYears: 5, gracePeriodYears: 2 },
      5
    );
    expect(rows[0].principal).toBe(0);
    expect(rows[0].interest).toBeCloseTo(100, 6);
    expect(rows[1].balance).toBe(1000);
    expect(rows[2].payment).toBeGreaterThan(0);
    expect(rows[4].balance).toBeCloseTo(0, 4);
  });

  it('annuity pays off principal exactly by term end', () => {
    const rows = loanSchedule(
      { principal: 100000, ratePct: 8, termYears: 10, gracePeriodYears: 0 },
      15
    );
    expect(rows[9].balance).toBeCloseTo(0, 2);
    for (let i = 10; i < 15; i++) {
      expect(rows[i].payment).toBe(0);
    }
  });
});

describe('yearlyCashFlows / cumulativeCF', () => {
  it('subtracts O&M and loan from revenue', () => {
    expect(yearlyCashFlows([100, 100], [10, 10], [20, 20])).toEqual([70, 70]);
  });
  it('cumulative starts at -equity and accumulates', () => {
    expect(cumulativeCF([100, 100, 100], 250)).toEqual([-150, -50, 50]);
  });
});

describe('npv', () => {
  it('matches manual calc', () => {
    expect(npv([110], 10, 100)).toBeCloseTo(0, 6);
  });
  it('positive for high-yielding flows', () => {
    expect(npv([100, 100, 100], 10, 200)).toBeGreaterThan(0);
  });
});

describe('irr', () => {
  it('matches NPV root', () => {
    const flows = [200, 250, 300, 350];
    const equity = 700;
    const r = irr(flows, equity);
    expect(r).toBeGreaterThan(0);
    expect(npv(flows, r * 100, equity)).toBeCloseTo(0, 4);
  });
  it('handles a textbook 10% IRR', () => {
    expect(irr([110], 100)).toBeCloseTo(0.1, 4);
  });
});

describe('paybackYears / breakEvenYear', () => {
  it('break-even returns first non-negative year', () => {
    expect(breakEvenYear([-100, -50, 25, 100])).toBe(3);
  });
  it('payback interpolates across the sign change', () => {
    expect(paybackYears([-100, -50, 50])).toBeCloseTo(2.5, 6);
  });
});

describe('co2Tonnes', () => {
  it('uses 0.82 kg/kWh and converts to tonnes', () => {
    const r = co2Tonnes([1_000_000]);
    expect(r.yearly[0]).toBeCloseTo(820, 6);
    expect(r.cumulative).toBeCloseTo(820, 6);
  });
});

/* ------------------------------------------------------------------------ */
/* computeEstimate — finance gating                                          */
/* ------------------------------------------------------------------------ */

describe('computeEstimate', () => {
  it('without finance layer: returns capex + totals only', () => {
    const est = testEstimate({ targetCapacityKW: 1000 });
    const out = computeEstimate(est);
    expect(out.capex.total).toBeGreaterThan(0);
    expect(out.totals.grandTotal).toBeGreaterThan(0);
    expect(out.finance).toBeNull();
  });

  it('with finance layer enabled: returns full finance results', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const out = computeEstimate(est);
    expect(out.finance).not.toBeNull();
    if (!out.finance) return;
    expect(out.finance.equity + out.finance.loanAmount).toBeCloseTo(
      out.capex.total,
      4
    );
    expect(out.finance.energy[0]).toBeGreaterThan(0);
    expect(out.finance.pnl).toHaveLength(25);
    expect(out.finance.om[0]).toBeCloseTo(
      (out.capex.total * 1.0) / 100,
      4
    );
  });

  it('totals.grandTotal matches capex.total within rounding', () => {
    const est = testEstimate({ targetCapacityKW: 1000 });
    const out = computeEstimate(est);
    expect(Math.abs(out.totals.grandTotal - out.capex.total)).toBeLessThan(1);
  });
});

/* ------------------------------------------------------------------------ */
/* tariffSchedule                                                            */
/* ------------------------------------------------------------------------ */

describe('tariffSchedule', () => {
  it('compounds escalation with no indexation', () => {
    const out = tariffSchedule({
      baseRate: 4,
      termYears: 3,
      escalationPct: 2,
      indexation: { kind: 'none' },
    });
    expect(out[0]).toBeCloseTo(4, 6);
    expect(out[1]).toBeCloseTo(4 * 1.02, 6);
    expect(out[2]).toBeCloseTo(4 * 1.02 * 1.02, 6);
  });

  it('cpi indexation compounds inflation pass-through on top of escalation', () => {
    const out = tariffSchedule({
      baseRate: 4,
      termYears: 2,
      escalationPct: 2,
      indexation: { kind: 'cpi', cpiFraction: 0.5 },
      inflationPct: 6,
    });
    expect(out[1]).toBeCloseTo(4 * 1.02 * 1.03, 4);
  });
});

/* ------------------------------------------------------------------------ */
/* lcoe + ppa solver                                                         */
/* ------------------------------------------------------------------------ */

describe('lcoeINRPerKWh', () => {
  it('returns a finite ₹/kWh for a typical 1 MW plant with finance layer', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const lcoe = lcoeINRPerKWh(est);
    expect(Number.isFinite(lcoe)).toBe(true);
    expect(lcoe).toBeGreaterThan(0);
  });

  it('returns 0 when finance layer is disabled', () => {
    const est = testEstimate({ targetCapacityKW: 1000 });
    expect(lcoeINRPerKWh(est)).toBe(0);
  });
});

describe('solvePPARate', () => {
  it('finds a rate whose IRR is near the target', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const result = solvePPARate({
      estimate: est,
      termYears: 25,
      escalationPct: 2,
      indexation: { kind: 'none' },
      targetIRR: 0.15,
    });
    expect(result.baseRate).toBeGreaterThan(0);
    expect(Math.abs(result.achievedIRR - 0.15)).toBeLessThan(0.01);
    expect(result.schedule).toHaveLength(25);
  });
});

describe('withPPARate', () => {
  it('overrides ppaRate and ppaEscalationPct, leaving everything else untouched', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const variant = withPPARate(est, 6.25, 3.5);
    expect(variant.finance?.revenue.ppaRate).toBeCloseTo(6.25, 6);
    expect(variant.finance?.revenue.ppaEscalationPct).toBeCloseTo(3.5, 6);
    expect(variant.id).toBe(est.id);
    expect(variant.targetCapacityKW).toBe(est.targetCapacityKW);
    expect(variant.materialized).toBe(est.materialized);
    expect(variant.finance?.basics).toEqual(est.finance?.basics);
    expect(variant.finance?.financing).toEqual(est.finance?.financing);
    expect(est.finance?.revenue.ppaRate).not.toBe(6.25);
  });

  it('cpi indexation folds the inflation pass-through into the escalation', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const inflation = est.finance!.basics.inflationPct;
    const variant = withPPARate(est, 5, 2, { kind: 'cpi', cpiFraction: 0.5 });
    const expected = ((1 + 0.02) * (1 + (0.5 * inflation) / 100) - 1) * 100;
    expect(variant.finance?.revenue.ppaEscalationPct).toBeCloseTo(expected, 6);
  });

  it('returns the estimate unchanged when finance is disabled', () => {
    const est = testEstimate({ targetCapacityKW: 1000 });
    expect(withPPARate(est, 9, 4)).toBe(est);
  });
});
