import { describe, expect, it } from 'vitest';
import {
  createEstimate,
  defaultFinanceLayer,
  duplicateEstimate,
  recomputeMaterialization,
} from './factory';
import {
  seedTemplates,
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_LT,
} from '../templates';

const HT = seedTemplates().find((t) => t.id === SEED_TEMPLATE_ID_HT)!;
const LT = seedTemplates().find((t) => t.id === SEED_TEMPLATE_ID_LT)!;

describe('createEstimate', () => {
  it('materialises at the template base capacity by default', () => {
    const est = createEstimate({ template: HT });
    expect(est.targetCapacityKW).toBe(HT.baseCapacityKW);
    expect(est.materialized.mainLines.length).toBe(HT.mainBom.length);
    expect(est.totals.grandTotal).toBeGreaterThan(0);
    expect(est.totals.perKwRate).toBeGreaterThan(0);
  });

  it('respects an explicit target capacity and re-materialises', () => {
    const half = createEstimate({ template: HT, targetCapacityKW: 500 });
    const full = createEstimate({ template: HT, targetCapacityKW: 1000 });
    expect(half.totals.grandTotal).toBeLessThan(full.totals.grandTotal);
  });

  it('snapshots the template version on the estimate', () => {
    const est = createEstimate({ template: HT });
    expect(est.selectedVersion).toBe(HT.version);
  });

  it('omits the finance layer by default (BOM-only estimate)', () => {
    const est = createEstimate({ template: HT });
    expect(est.finance).toBeUndefined();
  });

  it('attaches finance when explicitly enabled', () => {
    const est = createEstimate({
      template: HT,
      finance: defaultFinanceLayer(true),
    });
    expect(est.finance?.enabled).toBe(true);
  });

  it('initial selectedOptions match the template defaults', () => {
    const est = createEstimate({ template: HT });
    const expectedMain = HT.mainBom
      .filter((l) => l.isOptional && l.includedByDefault)
      .map((l) => l.id);
    const expectedScope = HT.otherScope
      .filter((s) => s.isOptional && s.includedByDefault)
      .map((s) => s.id);
    expect(est.selectedOptions.mainBomLineIds.sort()).toEqual(expectedMain.sort());
    expect(est.selectedOptions.otherScopeIds.sort()).toEqual(expectedScope.sort());
  });

  it('LT and HT templates produce different costs at the same capacity', () => {
    const ht = createEstimate({ template: HT, targetCapacityKW: 700 });
    const lt = createEstimate({ template: LT, targetCapacityKW: 700 });
    expect(ht.totals.grandTotal).not.toBe(lt.totals.grandTotal);
  });
});

describe('recomputeMaterialization', () => {
  it('updates totals to reflect a changed target capacity', () => {
    const small = createEstimate({ template: HT, targetCapacityKW: 200 });
    const grown = recomputeMaterialization(
      { ...small, targetCapacityKW: 1500 },
      HT
    );
    expect(grown.totals.grandTotal).toBeGreaterThan(small.totals.grandTotal);
  });

  it('refreshes selectedVersion to the supplied template', () => {
    const est = createEstimate({ template: HT });
    const bumped = { ...HT, version: 'v99' };
    const re = recomputeMaterialization(est, bumped);
    expect(re.selectedVersion).toBe('v99');
  });
});

describe('duplicateEstimate', () => {
  it('produces a deep copy with a new id', () => {
    const original = createEstimate({ template: HT });
    const copy = duplicateEstimate(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toContain('(copy)');
    // Mutating the copy must not affect the original.
    copy.materialized.mainLines[0].quantity = 9999;
    expect(original.materialized.mainLines[0].quantity).not.toBe(9999);
  });
});

describe('defaultFinanceLayer', () => {
  it('is disabled by default', () => {
    const f = defaultFinanceLayer();
    expect(f.enabled).toBe(false);
  });

  it('returns sane defaults that pass through computeEstimate', () => {
    const f = defaultFinanceLayer(true);
    expect(f.basics.lifespanYears).toBeGreaterThan(0);
    expect(f.financing.termYears).toBe(25);
    expect(f.financing.financedPct).toBeGreaterThanOrEqual(0);
    expect(f.financing.financedPct).toBeLessThanOrEqual(100);
  });
});
