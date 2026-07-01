import { describe, expect, it } from 'vitest';
import {
  annualEnergyKWh,
  annualEnergyKWhFromYield,
  avgDSCR,
  dscrBreaches,
  breakEvenYear,
  capexBreakdown,
  discountedPaybackYears,
  dscrSeries,
  icrSeries,
  levelizedTariff,
  llcr,
  minDSCR,
  plcr,
  co2Equivalents,
  co2Tonnes,
  homesPowered,
  computeEstimate,
  cumulativeCF,
  irr,
  lcoeFromSeries,
  lcoeINRPerKWh,
  loanSchedule,
  mirr,
  npv,
  paybackYears,
  peakFundingNeed,
  equityMultiple,
  profitabilityIndex,
  solvePPARate,
  specificYieldKWhPerKWpYr,
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

describe('specificYieldKWhPerKWpYr', () => {
  it('inverts annualEnergyKWhFromYield', () => {
    const energy = annualEnergyKWhFromYield(2, 1500);
    expect(specificYieldKWhPerKWpYr(2, energy)).toBeCloseTo(1500, 6);
  });
  it('returns 0 for non-positive size', () => {
    expect(specificYieldKWhPerKWpYr(0, 1000)).toBe(0);
  });
});

describe('homesPowered', () => {
  it('divides by the average household consumption', () => {
    expect(homesPowered(12000)).toBe(10);
  });
  it('rounds to whole homes', () => {
    expect(homesPowered(1800)).toBe(2);
  });
  it('returns 0 for zero, negative or non-finite input', () => {
    expect(homesPowered(0)).toBe(0);
    expect(homesPowered(-500)).toBe(0);
    expect(homesPowered(NaN)).toBe(0);
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

describe('mirr', () => {
  it('equals the simple return over a single period', () => {
    // one period, no interim flows -> rate-independent, just 110/100 - 1
    expect(mirr([110], 100, 10)).toBeCloseTo(0.1, 6);
  });
  it('sits between the discount rate and the IRR', () => {
    const flows = [200, 250, 300, 350];
    const equity = 700;
    const m = mirr(flows, equity, 10);
    expect(m).toBeGreaterThan(0.1);
    expect(m).toBeLessThan(irr(flows, equity));
  });
  it('is NaN without an inflow to span the outflow', () => {
    expect(mirr([-50], 100, 10)).toBeNaN();
  });
});

describe('profitabilityIndex', () => {
  it('is 1 at the NPV break-even point', () => {
    // npv([110], 10, 100) == 0, so PV of inflows equals equity -> PI == 1
    expect(profitabilityIndex([110], 10, 100)).toBeCloseTo(1, 6);
  });
  it('exceeds 1 when discounted inflows beat equity', () => {
    expect(profitabilityIndex([100, 100, 100], 10, 200)).toBeGreaterThan(1);
  });
  it('is NaN without equity at risk', () => {
    expect(profitabilityIndex([100], 10, 0)).toBeNaN();
  });
});

describe('equityMultiple', () => {
  it('is total undiscounted cash returned over equity invested', () => {
    expect(equityMultiple([100, 100, 100], 200)).toBeCloseTo(1.5, 6);
  });
  it('is 1 when the cash returned equals the equity', () => {
    expect(equityMultiple([40, 60], 100)).toBeCloseTo(1, 6);
  });
  it('is NaN without equity at risk', () => {
    expect(equityMultiple([100], 0)).toBeNaN();
  });
});

describe('peakFundingNeed', () => {
  it('is the magnitude of the deepest cumulative deficit', () => {
    expect(peakFundingNeed([-100, -40, 20])).toBe(100);
  });
  it('sits below equity when early debt service deepens the trough', () => {
    expect(peakFundingNeed([-100, -130, -50, 80])).toBe(130);
  });
  it('matches the cumulative series trough', () => {
    expect(peakFundingNeed(cumulativeCF([50, 50], 100))).toBe(50);
  });
  it('is 0 when the cumulative balance never goes negative', () => {
    expect(peakFundingNeed([10, 20, 30])).toBe(0);
  });
  it('is 0 for an empty series', () => {
    expect(peakFundingNeed([])).toBe(0);
  });
});

describe('dscr', () => {
  it('divides net operating income by debt service per year', () => {
    // (rev - om) / payment: (100-20)/40 = 2, (110-25)/50 = 1.7
    expect(dscrSeries([100, 110], [20, 25], [40, 50])).toEqual([2, 1.7]);
  });
  it('reports null in years with no debt service', () => {
    const s = dscrSeries([100, 100], [20, 20], [0, 50]);
    expect(s[0]).toBeNull();
    expect(s[1]).toBeCloseTo(1.6, 6);
  });
  it('min and avg skip the null years', () => {
    const s = dscrSeries([100, 100, 100], [10, 10, 10], [0, 30, 90]);
    expect(minDSCR(s)).toBeCloseTo(1, 6);
    expect(avgDSCR(s)).toBeCloseTo(2, 6);
  });
  it('return null when no year carries debt service', () => {
    const s = dscrSeries([100], [10], [0]);
    expect(minDSCR(s)).toBeNull();
    expect(avgDSCR(s)).toBeNull();
  });
  it('flags the first and total years below the covenant', () => {
    // dscr: [2, 0.85, 0.9] against a covenant of 1 -> breaches in years 2 and 3
    const s = dscrSeries([100, 27, 28], [20, 10, 10], [40, 20, 20]);
    expect(dscrBreaches(s, 1)).toEqual({ first: 2, count: 2 });
  });
  it('clears the covenant when every serviced year is above it', () => {
    const s = dscrSeries([100, 110], [20, 25], [40, 50]);
    expect(dscrBreaches(s, 1.2)).toEqual({ first: null, count: 0 });
  });
  it('skips years without debt service when counting breaches', () => {
    // year 1 has no service (null), year 2 dscr 0.8 breaches
    const s = dscrSeries([100, 90], [20, 10], [0, 100]);
    expect(dscrBreaches(s, 1)).toEqual({ first: 2, count: 1 });
  });
});

describe('icrSeries', () => {
  it('divides net operating income by interest per year', () => {
    // (rev - om) / interest: (100-20)/10 = 8, (110-25)/17 = 5
    expect(icrSeries([100, 110], [20, 25], [10, 17])).toEqual([8, 5]);
  });
  it('reports null once interest drops to zero', () => {
    const s = icrSeries([100, 100], [20, 20], [40, 0]);
    expect(s[0]).toBeCloseTo(2, 6);
    expect(s[1]).toBeNull();
  });
  it('reuses the dscr summaries against the interest floor', () => {
    // icr: [null, 3, 1], covenant 1.5 -> min 1, breaches in the last serviced year
    const s = icrSeries([100, 100, 40], [10, 10, 10], [0, 30, 30]);
    expect(minDSCR(s)).toBeCloseTo(1, 6);
    expect(dscrBreaches(s, 1.5)).toEqual({ first: 3, count: 1 });
  });
});

describe('llcr', () => {
  it('discounts cfads over the loan term against the drawn loan', () => {
    // cfads 80/yr, r=0.1: (80/1.1 + 80/1.21) / 100 = 1.3884
    expect(llcr([100, 100], [20, 20], 100, 10, 2)).toBeCloseTo(1.3884, 4);
  });
  it('only counts years inside the loan term', () => {
    // term 2 ignores the third year even though cash keeps coming
    expect(llcr([100, 100, 100], [20, 20, 20], 100, 10, 2)).toBeCloseTo(1.3884, 4);
  });
  it('returns null for an unfinanced plant', () => {
    expect(llcr([100, 100], [20, 20], 0, 10, 2)).toBeNull();
  });
});

describe('plcr', () => {
  it('discounts cfads over the whole life against the drawn loan', () => {
    // cfads 80/yr over 3 years, r=0.1: (80/1.1 + 80/1.21 + 80/1.331) / 100 = 1.98947
    expect(plcr([100, 100, 100], [20, 20, 20], 100, 10)).toBeCloseTo(1.98947, 4);
  });
  it('is at least llcr because it keeps the post-loan years', () => {
    const rev = [100, 100, 100, 100];
    const om = [20, 20, 20, 20];
    const life = plcr(rev, om, 100, 10)!;
    const loan = llcr(rev, om, 100, 10, 2)!;
    expect(life).toBeGreaterThan(loan);
  });
  it('returns null for an unfinanced plant', () => {
    expect(plcr([100, 100], [20, 20], 0, 10)).toBeNull();
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

describe('discountedPaybackYears', () => {
  it('matches simple payback at a 0% discount rate', () => {
    // undiscounted cumCF would be [-50, 50] -> payback at 1.5y
    expect(discountedPaybackYears([50, 100], 100, 0)).toBeCloseTo(1.5, 6);
  });
  it('pushes payback later than the undiscounted figure', () => {
    const cf = [40, 40, 40, 40];
    const simple = paybackYears(cumulativeCF(cf, 100));
    const disc = discountedPaybackYears(cf, 100, 10);
    expect(simple).not.toBeNull();
    expect(disc).not.toBeNull();
    expect(disc!).toBeGreaterThan(simple!);
  });
  it('returns null when discounted flows never recover equity', () => {
    expect(discountedPaybackYears([5, 5, 5], 1000, 8)).toBeNull();
  });
});

describe('co2Tonnes', () => {
  it('uses 0.82 kg/kWh and converts to tonnes', () => {
    const r = co2Tonnes([1_000_000]);
    expect(r.yearly[0]).toBeCloseTo(820, 6);
    expect(r.cumulative).toBeCloseTo(820, 6);
  });
});

describe('co2Equivalents', () => {
  it('converts tonnes to trees, cars, km and phone charges', () => {
    const r = co2Equivalents(46);
    expect(r.trees).toBe(767);
    expect(r.cars).toBe(10);
    expect(r.kmDriven).toBe(383333);
    expect(r.phonesCharged).toBe(5596107);
  });
  it('clamps non-positive and non-finite input to zero', () => {
    expect(co2Equivalents(0)).toEqual({
      trees: 0,
      cars: 0,
      kmDriven: 0,
      phonesCharged: 0,
    });
    expect(co2Equivalents(-5)).toEqual({
      trees: 0,
      cars: 0,
      kmDriven: 0,
      phonesCharged: 0,
    });
    expect(co2Equivalents(NaN)).toEqual({
      trees: 0,
      cars: 0,
      kmDriven: 0,
      phonesCharged: 0,
    });
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
    expect(out.finance.equity + out.finance.loanAmount).toBeCloseTo(out.capex.total, 4);
    expect(out.finance.energy[0]).toBeGreaterThan(0);
    expect(out.finance.pnl).toHaveLength(25);
    expect(out.finance.om[0]).toBeCloseTo((out.capex.total * 1.0) / 100, 4);
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
/* levelizedTariff                                                           */
/* ------------------------------------------------------------------------ */

describe('levelizedTariff', () => {
  it('equals a flat rate when the schedule never escalates', () => {
    const schedule = [3, 3, 3];
    const energy = [100, 95, 90];
    expect(levelizedTariff(schedule, energy, 8)).toBeCloseTo(3, 6);
  });

  it('lands between the first and last year of an escalating schedule', () => {
    const schedule = [3, 3.3, 3.63];
    const energy = [100, 100, 100];
    const lev = levelizedTariff(schedule, energy, 8);
    expect(lev).toBeGreaterThan(schedule[0]);
    expect(lev).toBeLessThan(schedule[schedule.length - 1]);
  });

  it('weights by discounted energy, not a plain average', () => {
    const schedule = [2, 6];
    const energy = [100, 100];
    // discounting front-loads year 1, so the levelized rate sits below the 4 mean
    const pvRev = (2 * 100) / 1.1 + (6 * 100) / 1.1 ** 2;
    const pvEnergy = 100 / 1.1 + 100 / 1.1 ** 2;
    expect(levelizedTariff(schedule, energy, 10)).toBeCloseTo(pvRev / pvEnergy, 6);
    expect(levelizedTariff(schedule, energy, 10)).toBeLessThan(4);
  });

  it('pairs term-by-term up to the shorter series', () => {
    const schedule = [4, 4, 4, 4, 4];
    const energy = [100, 100];
    expect(levelizedTariff(schedule, energy, 7)).toBeCloseTo(4, 6);
  });

  it('returns 0 when there is no generation to weight', () => {
    expect(levelizedTariff([4, 4], [], 8)).toBe(0);
    expect(levelizedTariff([4, 4], [0, 0], 8)).toBe(0);
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

  it('matches the estimate-level helper when fed the same series', () => {
    const est = testEstimate({
      targetCapacityKW: 1000,
      finance: { ...defaultFinanceLayer(true) },
    });
    const finance = computeEstimate(est).finance!;
    expect(finance.lcoe).toBeCloseTo(lcoeINRPerKWh(est), 6);
  });
});

describe('lcoeFromSeries', () => {
  it('is capex divided by discounted energy when there is no om', () => {
    // r=0 so no discounting: 1000 / (100 + 100) = 5 per kWh
    expect(lcoeFromSeries(1000, [0, 0], [100, 100], 0)).toBeCloseTo(5, 6);
  });

  it('folds om into the cost side', () => {
    // r=0: (1000 + 50 + 50) / (100 + 100) = 5.5
    expect(lcoeFromSeries(1000, [50, 50], [100, 100], 0)).toBeCloseTo(5.5, 6);
  });

  it('returns Infinity when there is no energy', () => {
    expect(lcoeFromSeries(1000, [10], [0], 8)).toBe(Infinity);
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
