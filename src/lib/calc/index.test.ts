import { describe, expect, it } from 'vitest';
import {
  annualEnergyKWh,
  breakEvenYear,
  capexBreakdown,
  co2Tonnes,
  computeScenario,
  cumulativeCF,
  irr,
  loanSchedule,
  npv,
  paybackYears,
  yearlyCashFlows,
  yearlyEnergy,
  yearlyOM,
  yearlyRevenue,
} from '.';
import { createScenario } from '../scenario';
import type { Materials } from '@/types';

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
    const out = yearlyEnergy(3, 1000, 1); // 1% decay
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

describe('capexBreakdown', () => {
  it('sums material categories and customs', () => {
    const materials: Materials = {
      panels: { id: 'p', name: 'Panels', unitCost: 10, quantity: 100 }, // 1000
      cables: { id: 'c', name: 'Cables', unitCost: 1, quantity: 100 }, // 100
      inverters: { id: 'i', name: 'Inverters', unitCost: 5, quantity: 100 }, // 500
      mounting: { id: 'm', name: 'Mounting', unitCost: 2, quantity: 100 }, // 200
      transformers: { id: 't', name: 'Transformers', unitCost: 1, quantity: 100 }, // 100
      civil: { id: 'cv', name: 'Civil', unitCost: 3, quantity: 100 }, // 300
      bos: { id: 'b', name: 'BOS', unitCost: 4, quantity: 100 }, // 400
      custom: [{ id: 'x1', name: 'Permitting', unitCost: 50000, quantity: 1 }],
    };
    const r = capexBreakdown(materials);
    expect(r.total).toBe(1000 + 100 + 500 + 200 + 100 + 300 + 400 + 50000);
    expect(r.byKey.panels.amount).toBe(1000);
    expect(r.byKey.x1.amount).toBe(50000);
  });
});

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

  it('grace period: interest-only then annuity, principal preserved during grace', () => {
    const rows = loanSchedule(
      { principal: 1000, ratePct: 10, termYears: 5, gracePeriodYears: 2 },
      5
    );
    expect(rows[0].principal).toBe(0);
    expect(rows[0].interest).toBeCloseTo(100, 6);
    expect(rows[0].payment).toBeCloseTo(100, 6);
    expect(rows[1].balance).toBe(1000);
    // Years 3..5 amortise
    expect(rows[2].payment).toBeGreaterThan(0);
    expect(rows[4].balance).toBeCloseTo(0, 4);
  });

  it('annuity pays off principal exactly by term end', () => {
    const rows = loanSchedule(
      { principal: 100000, ratePct: 8, termYears: 10, gracePeriodYears: 0 },
      15
    );
    expect(rows[9].balance).toBeCloseTo(0, 2);
    // Years 11..15 should be zero
    for (let i = 10; i < 15; i++) {
      expect(rows[i].payment).toBe(0);
    }
  });

  it('extraByYear with front-loaded extras retires the loan sooner than no extras', () => {
    const principal = 100_000;
    const ratePct = 8;
    const termYears = 10;
    const baseline = loanSchedule(
      { principal, ratePct, termYears, gracePeriodYears: 0 },
      15
    );
    // Big early extras compress the schedule.
    const frontLoaded = [25_000, 25_000, 25_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const front = loanSchedule(
      { principal, ratePct, termYears, gracePeriodYears: 0, extraByYear: frontLoaded },
      15
    );
    const baseRetire = baseline.findIndex((r) => r.balance <= 1e-6 && r.year >= 1);
    const frontRetire = front.findIndex((r) => r.balance <= 1e-6 && r.year >= 1);
    expect(baseRetire).toBeGreaterThanOrEqual(0);
    expect(frontRetire).toBeGreaterThanOrEqual(0);
    expect(frontRetire).toBeLessThan(baseRetire);
  });

  it('extraByYear takes precedence over extraAnnualPrincipal', () => {
    const both = loanSchedule(
      {
        principal: 100_000,
        ratePct: 8,
        termYears: 10,
        gracePeriodYears: 0,
        extraAnnualPrincipal: 99_999, // would retire instantly
        extraByYear: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      10
    );
    // Per-year array overrides flat: with all zeros, schedule looks like the
    // baseline (no early retirement before year 10).
    expect(both[0].balance).toBeGreaterThan(0);
    expect(both[8].balance).toBeGreaterThan(0);
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
    // CFs of [110] @ 10%, equity 100 -> NPV = -100 + 110/1.1 = 0
    expect(npv([110], 10, 100)).toBeCloseTo(0, 6);
  });
  it('positive for high-yielding flows', () => {
    expect(npv([100, 100, 100], 10, 200)).toBeGreaterThan(0);
  });
});

describe('irr', () => {
  it('matches NPV root: irr makes NPV ≈ 0', () => {
    const flows = [200, 250, 300, 350];
    const equity = 700;
    const r = irr(flows, equity);
    expect(r).toBeGreaterThan(0);
    expect(npv(flows, r * 100, equity)).toBeCloseTo(0, 4);
  });
  it("returns a strongly negative IRR when flows can't recover equity", () => {
    const r = irr([10, 10, 10], 1_000_000);
    expect(Number.isNaN(r)).toBe(false);
    expect(r).toBeLessThan(-0.5);
  });
  it('returns NaN when no negative flow exists', () => {
    expect(irr([100, 100], 0)).toBeNaN();
  });
  it('handles a textbook 10% IRR', () => {
    // -100 + 110/1.1 = 0  -> IRR = 10%
    expect(irr([110], 100)).toBeCloseTo(0.1, 4);
  });
});

describe('paybackYears / breakEvenYear', () => {
  it('break-even returns first non-negative year', () => {
    expect(breakEvenYear([-100, -50, 25, 100])).toBe(3);
  });
  it('break-even returns null when never breaks even', () => {
    expect(breakEvenYear([-100, -50, -25])).toBeNull();
  });
  it('payback interpolates across the sign change', () => {
    // Year 2 ends at -50, Year 3 ends at +50 → payback at 2.5
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

describe('computeScenario integration', () => {
  it('produces a coherent set of results for a realistic scenario', () => {
    const scn = createScenario({
      name: 'Test',
      basics: {
        sizeMW: 1,
        cufPct: 20,
        lifespanYears: 25,
        degradationPct: 0.5,
        inflationPct: 6,
        discountPct: 10,
      },
      revenue: { ppaRate: 3.5, ppaEscalationPct: 1 },
      om: { percentOfCapex: 1.0, overrides: [] },
      financing: { financedPct: 70, interestPct: 9, termYears: 12, gracePeriodYears: 1 },
    });
    const r = computeScenario(scn);
    expect(r.capex.total).toBeGreaterThan(0);
    expect(r.equity + r.loanAmount).toBeCloseTo(r.capex.total, 4);
    expect(r.energy[0]).toBeCloseTo(annualEnergyKWh(1, 20), 4);
    expect(r.energy[1]).toBeLessThan(r.energy[0]);
    expect(r.pnl).toHaveLength(25);
    expect(r.pnl[0].cumulativeCashFlow).toBeLessThan(0);
    expect(r.cumulativeCF.at(-1)).toBeGreaterThan(r.cumulativeCF[0]);
    // PnL rows expose loan balance for the wealth-building view.
    expect(r.pnl[0].loanBalance).toBeGreaterThanOrEqual(0);
    // Year-1 O&M = capex × percent / 100.
    expect(r.om[0]).toBeCloseTo((r.capex.total * 1.0) / 100, 4);
  });

  it('O&M tracks live capex changes via percentOfCapex', () => {
    const scn = createScenario({
      basics: { sizeMW: 1, cufPct: 20 },
      om: { percentOfCapex: 1.5, overrides: [] },
    });
    const before = computeScenario(scn);
    // Doubling all material unit costs doubles capex; O&M should follow.
    const doubled = structuredClone(scn);
    for (const key of [
      'panels',
      'cables',
      'inverters',
      'mounting',
      'transformers',
      'civil',
      'bos',
    ] as const) {
      doubled.materials[key].unitCost *= 2;
    }
    const after = computeScenario(doubled);
    expect(after.capex.total).toBeCloseTo(before.capex.total * 2, 4);
    expect(after.om[0]).toBeCloseTo(before.om[0] * 2, 4);
  });

  it('autoAbsorbSurplus zeroes out post-grace net CF while loan is active', () => {
    const scn = createScenario({
      name: 'Auto-absorb test',
      basics: {
        sizeMW: 2,
        cufPct: 22,
        lifespanYears: 25,
        degradationPct: 0.5,
        inflationPct: 6,
        discountPct: 10,
      },
      revenue: { ppaRate: 3.5, ppaEscalationPct: 2 },
      om: { percentOfCapex: 1.0, overrides: [] },
      financing: { financedPct: 80, interestPct: 9, termYears: 12, gracePeriodYears: 1 },
    });
    const r = computeScenario(scn, { autoAbsorbSurplus: true });
    // For every post-grace year while a loan payment is due, surplus is fully
    // applied to principal so net CF should be ≈ 0 (within float noise).
    for (let i = 0; i < r.cashflows.length; i++) {
      const prev = r.loan[i - 1];
      const inGrace = i === 0; // grace = 1 year
      const loanActive = r.loan[i].payment > 0;
      const justRetired = prev && prev.balance > 1e-6 && r.loan[i].balance <= 1e-6;
      if (!inGrace && loanActive && !justRetired) {
        expect(Math.abs(r.cashflows[i])).toBeLessThan(1);
      }
    }
    // Loan retires strictly before its term thanks to absorbed surplus.
    const baseline = computeScenario(scn);
    const baselineRetire = baseline.loan.findIndex((row) => row.payment === 0);
    const absorbedRetire = r.loan.findIndex((row) => row.payment === 0);
    expect(absorbedRetire).toBeGreaterThan(-1);
    expect(absorbedRetire).toBeLessThan(
      baselineRetire === -1 ? Infinity : baselineRetire
    );
  });

  it('autoAbsorbSurplus produces a non-decreasing net position trajectory', () => {
    const scn = createScenario({
      name: 'Net position test',
      basics: {
        sizeMW: 2,
        cufPct: 22,
        lifespanYears: 25,
        degradationPct: 0.5,
        inflationPct: 6,
        discountPct: 10,
      },
      revenue: { ppaRate: 3.5, ppaEscalationPct: 2 },
      om: { percentOfCapex: 1.0, overrides: [] },
      financing: { financedPct: 80, interestPct: 9, termYears: 12, gracePeriodYears: 1 },
    });
    const r = computeScenario(scn, { autoAbsorbSurplus: true });
    // Net Position = cumulativeCF + (loanInitial − loanBalance). With auto-absorb
    // every post-grace year contributes either positive net CF or positive loan
    // paydown (or both), so the series must be monotonic non-decreasing.
    const netPosition = r.cumulativeCF.map(
      (cf, i) => cf + (r.loanAmount - r.loan[i].balance)
    );
    for (let i = 1; i < netPosition.length; i++) {
      expect(netPosition[i]).toBeGreaterThanOrEqual(netPosition[i - 1] - 1e-4);
    }
  });
});
