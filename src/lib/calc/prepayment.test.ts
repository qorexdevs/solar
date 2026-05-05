import { describe, expect, it } from 'vitest';
import { computeEstimate, maxMonthlyPrepayment, type FinanceResults } from '.';
import type { FinanceLayer } from '@/types';
import {
  createEstimate,
  defaultFinanceLayer,
  defaultSelectionsFromFacets,
} from '../estimate';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';
import { seedTemplates } from '@/lib/templates';

type FinancePatch = {
  basics?: Partial<FinanceLayer['basics']>;
  revenue?: Partial<FinanceLayer['revenue']>;
  om?: Partial<FinanceLayer['om']>;
  financing?: Partial<FinanceLayer['financing']>;
};

function financeLayer(patch: FinancePatch = {}): FinanceLayer {
  const base = defaultFinanceLayer(true);
  return {
    ...base,
    basics: { ...base.basics, ...patch.basics },
    revenue: { ...base.revenue, ...patch.revenue },
    om: { ...base.om, ...patch.om },
    financing: { ...base.financing, ...patch.financing },
  };
}

function testEstimate(patch: FinancePatch = {}) {
  const facets = seedFacets();
  const templates = seedTemplates();
  const catalogItems = seedMaterialCatalog();
  const templatesById = new Map(templates.map((t) => [t.id, t]));

  return createEstimate({
    facets,
    templates,
    catalogItems,
    selections: defaultSelectionsFromFacets(facets, templatesById),
    targetCapacityKW: 1000,
    finance: financeLayer(patch),
  });
}

function activeCashFlowFloor(finance: FinanceResults): number {
  let min = Infinity;
  for (let i = 0; i < finance.loan.length; i++) {
    if (finance.loan[i].principal > 1e-6 && finance.cashflows[i] < min) {
      min = finance.cashflows[i];
    }
  }
  return min;
}

describe('maxMonthlyPrepayment', () => {
  it('converges on a normal scenario', () => {
    const est = testEstimate({
      revenue: { ppaRate: 6, ppaEscalationPct: 1 },
      om: { percentOfCapex: 0.5 },
      financing: {
        financedPct: 70,
        interestPct: 8,
        termYears: 15,
        gracePeriodYears: 1,
      },
    });

    const monthly = maxMonthlyPrepayment(est, null);
    const out = computeEstimate(est, { extraAnnualPrincipal: monthly * 12 });

    expect(monthly).toBeGreaterThan(0);
    expect(out.finance).not.toBeNull();
    if (!out.finance) return;
    expect(activeCashFlowFloor(out.finance)).toBeGreaterThanOrEqual(0);
    expect(monthly).toBeLessThan(Math.floor(out.finance.loanAmount / 12));
  });

  it('returns 0 when the baseline loan-active cash flow is negative', () => {
    const est = testEstimate({
      basics: { cufPct: 5 },
      revenue: { ppaRate: 1, ppaEscalationPct: 0 },
      om: { percentOfCapex: 25 },
      financing: {
        financedPct: 80,
        interestPct: 12,
        termYears: 20,
        gracePeriodYears: 1,
      },
    });

    expect(maxMonthlyPrepayment(est, null)).toBe(0);
  });

  it('caps huge-surplus scenarios at the full loan amount', () => {
    const est = testEstimate({
      basics: { cufPct: 30 },
      revenue: { ppaRate: 50, ppaEscalationPct: 0 },
      om: { percentOfCapex: 0 },
      financing: {
        financedPct: 100,
        interestPct: 0,
        termYears: 20,
        gracePeriodYears: 0,
      },
    });
    const out = computeEstimate(est);

    expect(out.finance).not.toBeNull();
    if (!out.finance) return;
    expect(maxMonthlyPrepayment(est, null)).toBe(Math.floor(out.finance.loanAmount / 12));
  });

  it('returns 0 when the grace period equals the loan term', () => {
    const est = testEstimate({
      revenue: { ppaRate: 12, ppaEscalationPct: 0 },
      om: { percentOfCapex: 0 },
      financing: {
        financedPct: 80,
        interestPct: 8,
        termYears: 5,
        gracePeriodYears: 5,
      },
    });

    expect(maxMonthlyPrepayment(est, null)).toBe(0);
  });
});
