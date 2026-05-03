import { describe, expect, it } from 'vitest';
import type { BOMLineItem, OtherScopeItem } from '@/types';
import { describeApplicability, matchesApplicability } from './applicability';
import { composeEstimate, defaultSelectedOptionsFromSelections } from '@/lib/composer';
import { computeTotals } from './materialize';
import { scaledQuantity, scaledScopeAmount } from './scaling';
import type { ScalingContext } from './scaling';
import { validateTemplate } from './validate';
import { seedTemplates, SEED_TEMPLATE_ID_HT } from './seed';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';
import { defaultSelectionsFromFacets } from '@/lib/estimate';
import type { ComposeMode } from '@/types';

function makeLine(overrides: Partial<BOMLineItem> = {}): BOMLineItem {
  return {
    id: 'l1',
    sequence: 1,
    category: 'modules',
    itemName: 'Test',
    description: '',
    uom: 'count',
    baseQuantity: 100,
    rate: 10,
    gstPercent: 18,
    scalingType: 'fixed',
    isOptional: false,
    includedByDefault: true,
    ...overrides,
  };
}

function makeScope(overrides: Partial<OtherScopeItem> = {}): OtherScopeItem {
  return {
    id: 's1',
    sequence: 1,
    scopeName: 'Test scope',
    baseAmount: 10000,
    gstPercent: 18,
    scalingType: 'fixed',
    isOptional: false,
    includedByDefault: true,
    ...overrides,
  };
}

const baseCtx: ScalingContext = {
  baseCapacityKW: 1000,
  targetCapacityKW: 500,
  syncType: 'HT',
  projectType: 'utility',
};

describe('scaledQuantity', () => {
  it('fixed returns base regardless of capacity', () => {
    const line = makeLine({ scalingType: 'fixed', baseQuantity: 7 });
    expect(scaledQuantity(line, baseCtx)).toBe(7);
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 5000 })).toBe(7);
  });

  it('linear scales pro-rata', () => {
    const line = makeLine({
      scalingType: 'linear',
      baseQuantity: 1000,
      uom: 'meter',
    });
    expect(scaledQuantity(line, baseCtx)).toBe(500);
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 1500 })).toBe(1500);
  });

  it('linear count UoM rounds', () => {
    const line = makeLine({
      scalingType: 'linear',
      baseQuantity: 1852,
      uom: 'count',
    });
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 700 })).toBe(
      Math.round(1852 * 0.7)
    );
  });
});

describe('scaledScopeAmount', () => {
  it('linear scales other-scope amount', () => {
    const item = makeScope({ scalingType: 'linear', baseAmount: 100000 });
    expect(scaledScopeAmount(item, baseCtx)).toBe(50000);
  });

  it('fixed keeps amount unchanged', () => {
    const item = makeScope({ scalingType: 'fixed', baseAmount: 70000 });
    expect(scaledScopeAmount(item, baseCtx)).toBe(70000);
  });
});

describe('matchesApplicability', () => {
  it('respects sync and size guards', () => {
    expect(
      matchesApplicability({ syncTypes: ['HT'] }, { ...baseCtx, syncType: 'HT' })
    ).toBe(true);
    expect(
      matchesApplicability({ syncTypes: ['HT'] }, { ...baseCtx, syncType: 'LT' })
    ).toBe(false);

    const rule = { sizeRangeKW: { min: 200, max: 1000 } };
    expect(matchesApplicability(rule, { ...baseCtx, targetCapacityKW: 500 })).toBe(true);
    expect(matchesApplicability(rule, { ...baseCtx, targetCapacityKW: 100 })).toBe(false);
  });

  it('describeApplicability summarizes rules', () => {
    expect(describeApplicability({ syncTypes: ['HT'] })).toBe('HT');
    expect(describeApplicability(undefined)).toBe('');
  });
});

describe('computeTotals', () => {
  it('skips excluded lines from aggregates', () => {
    const totals = computeTotals(
      [
        {
          id: 'a',
          catalogItemId: 'a',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceLineIds: ['a'],
          sourceLineId: 'a',
          sequence: 1,
          category: 'modules',
          itemName: 'M',
          description: '',
          uom: 'count',
          scalingType: 'fixed',
          quantity: 1,
          rate: 1000,
          gstPercent: 18,
          subtotal: 1000,
          gst: 180,
          total: 1180,
          included: true,
          applicabilityFiltered: false,
          userExcluded: false,
        },
        {
          id: 'b',
          catalogItemId: 'b',
          composeMode: 'max' as ComposeMode,
          contributedBy: [],
          sourceLineIds: ['b'],
          sourceLineId: 'b',
          sequence: 2,
          category: 'modules',
          itemName: 'X',
          description: '',
          uom: 'count',
          scalingType: 'fixed',
          quantity: 0,
          rate: 0,
          gstPercent: 0,
          subtotal: 999_999,
          gst: 999_999,
          total: 999_999,
          included: false,
          applicabilityFiltered: false,
          userExcluded: true,
        },
      ],
      [],
      1
    );
    expect(totals.mainBomSubtotal).toBe(1000);
    expect(totals.grandTotal).toBe(1180);
  });
});

describe('validateTemplate', () => {
  it('flags missing name/version', () => {
    const tpl = seedTemplates()[0]!;
    const broken = structuredClone({ ...tpl, name: '', version: '' });
    expect(validateTemplate(broken).some((i) => i.path === 'name')).toBe(true);
    expect(validateTemplate(broken).some((i) => i.path === 'version')).toBe(true);
  });

  it('seed templates validate', () => {
    expect(seedTemplates().map(validateTemplate).every((i) => i.length === 0)).toBe(
      true
    );
  });
});

describe('composeEstimate with seeds', () => {
  it('HT base defaults produce a BOM with sensible totals', () => {
    const facets = seedFacets();
    const templates = seedTemplates();
    const catalogItems = seedMaterialCatalog();
    const byId = new Map(templates.map((t) => [t.id, t]));
    const selections = defaultSelectionsFromFacets(facets, byId);
    const selectedOptionsPerTemplate =
      defaultSelectedOptionsFromSelections(selections, byId);
    const ht = templates.find((t) => t.id === SEED_TEMPLATE_ID_HT)!;
    const { totals } = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      targetCapacityKW: ht.baseCapacityKW,
      catalogItems,
      templates,
    });
    expect(totals.grandTotal).toBeGreaterThan(0);
    expect(totals.perKwRate).toBeGreaterThan(0);
  });
});
