import { describe, expect, it } from 'vitest';
import type {
  BOMLineItem,
  OtherScopeItem,
  ScenarioTemplate,
  SelectedOptions,
} from '@/types';
import { describeApplicability, matchesApplicability } from './applicability';
import {
  scaledQuantity,
  scaledScopeAmount,
  type ScalingContext,
} from './scaling';
import {
  computeTotals,
  defaultSelectedOptionsFor,
  materializeTemplate,
} from './materialize';
import { validateTemplate } from './validate';
import { seedTemplates, SEED_TEMPLATE_ID_HT, SEED_TEMPLATE_ID_LT } from './seed';

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------------ */
/* Scaling                                                                   */
/* ------------------------------------------------------------------------ */

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
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 1500 })).toBe(
      1500
    );
  });

  it('linear with countable UoM rounds', () => {
    const line = makeLine({
      scalingType: 'linear',
      baseQuantity: 1852,
      uom: 'count',
    });
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 700 })).toBe(
      Math.round(1852 * 0.7)
    );
  });

  it('step ceil-buckets capacity into discrete units', () => {
    const line = makeLine({
      scalingType: 'step',
      unitCapacityKW: 250,
      baseQuantity: 1,
    });
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 500 })).toBe(2);
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 501 })).toBe(3);
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 250 })).toBe(1);
  });

  it('step with missing unitCapacityKW returns 0', () => {
    const line = makeLine({ scalingType: 'step', baseQuantity: 1 });
    expect(scaledQuantity(line, baseCtx)).toBe(0);
  });

  it('conditional returns base; gating happens via applicability/included flag', () => {
    const line = makeLine({ scalingType: 'conditional', baseQuantity: 5 });
    expect(scaledQuantity(line, baseCtx)).toBe(5);
  });

  it('optional returns base (caller gates inclusion)', () => {
    const line = makeLine({ scalingType: 'optional', baseQuantity: 3 });
    expect(scaledQuantity(line, baseCtx)).toBe(3);
  });

  it('scalingFormula overrides default math', () => {
    const line = makeLine({
      scalingType: 'fixed',
      baseQuantity: 0, // overridden by formula
      scalingFormula: 'Math.ceil(targetKW / 100) * 5',
    });
    expect(scaledQuantity(line, { ...baseCtx, targetCapacityKW: 350 })).toBe(20);
  });

  it('bad scalingFormula falls back to default math', () => {
    const line = makeLine({
      scalingType: 'fixed',
      baseQuantity: 9,
      scalingFormula: 'totally bogus !! @@',
    });
    expect(scaledQuantity(line, baseCtx)).toBe(9);
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

/* ------------------------------------------------------------------------ */
/* Applicability                                                             */
/* ------------------------------------------------------------------------ */

describe('matchesApplicability', () => {
  it('undefined rule matches everything', () => {
    expect(matchesApplicability(undefined, baseCtx)).toBe(true);
  });

  it('syncTypes filter gates by sync', () => {
    expect(
      matchesApplicability({ syncTypes: ['HT'] }, { ...baseCtx, syncType: 'HT' })
    ).toBe(true);
    expect(
      matchesApplicability({ syncTypes: ['HT'] }, { ...baseCtx, syncType: 'LT' })
    ).toBe(false);
  });

  it('sizeRangeKW filter gates by capacity', () => {
    const rule = { sizeRangeKW: { min: 200, max: 1000 } };
    expect(matchesApplicability(rule, { ...baseCtx, targetCapacityKW: 500 })).toBe(
      true
    );
    expect(matchesApplicability(rule, { ...baseCtx, targetCapacityKW: 100 })).toBe(
      false
    );
    expect(matchesApplicability(rule, { ...baseCtx, targetCapacityKW: 1500 })).toBe(
      false
    );
  });

  it('describeApplicability summarises non-empty rules', () => {
    expect(describeApplicability({ syncTypes: ['HT'] })).toBe('HT');
    expect(describeApplicability(undefined)).toBe('');
    expect(
      describeApplicability({ sizeRangeKW: { min: 100, max: 500 } })
    ).toBe('100–500 kW');
    expect(
      describeApplicability({ sizeRangeKW: { min: 100, max: 1500 } })
    ).toBe('100 kW–1.5 MW');
    expect(describeApplicability({ sizeRangeKW: { min: 1000 } })).toBe('≥ 1 MW');
  });
});

/* ------------------------------------------------------------------------ */
/* Materialize + totals                                                      */
/* ------------------------------------------------------------------------ */

function tplOf(args: {
  baseCapacityKW: number;
  syncType?: 'HT' | 'LT';
  mainBom: BOMLineItem[];
  otherScope?: OtherScopeItem[];
}): ScenarioTemplate {
  return {
    id: 't1',
    name: 'Test template',
    projectType: 'utility',
    syncType: args.syncType ?? 'HT',
    baseCapacityKW: args.baseCapacityKW,
    status: 'active',
    version: 'v1',
    effectiveFrom: 0,
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    mainBom: args.mainBom,
    otherScope: args.otherScope ?? [],
  };
}

describe('materializeTemplate', () => {
  it('PRD §7 totals: subtotal + GST + per-kW', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [
        makeLine({
          id: 'a',
          baseQuantity: 100,
          rate: 1000,
          gstPercent: 18,
          scalingType: 'fixed',
        }),
      ],
      otherScope: [
        makeScope({ id: 'b', baseAmount: 50000, gstPercent: 18 }),
      ],
    });
    const opts: SelectedOptions = { mainBomLineIds: [], otherScopeIds: [] };
    const { totals } = materializeTemplate({
      template: tpl,
      targetCapacityKW: 1000,
      selectedOptions: opts,
    });

    expect(totals.mainBomSubtotal).toBe(100_000);
    expect(totals.mainBomGst).toBe(18_000);
    expect(totals.otherScopeSubtotal).toBe(50_000);
    expect(totals.otherScopeGst).toBe(9_000);
    expect(totals.grandTotal).toBe(177_000);
    expect(totals.perKwRate).toBe(177);
  });

  it('linear lines scale with target', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [
        makeLine({
          id: 'a',
          baseQuantity: 1000,
          rate: 10,
          gstPercent: 0,
          scalingType: 'linear',
          uom: 'meter',
        }),
      ],
    });
    const out = materializeTemplate({
      template: tpl,
      targetCapacityKW: 500,
      selectedOptions: { mainBomLineIds: [], otherScopeIds: [] },
    });
    expect(out.materialized.mainLines[0].quantity).toBe(500);
    expect(out.totals.mainBomSubtotal).toBe(5_000);
  });

  it('conditional HT lines are excluded for LT estimates', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      syncType: 'LT',
      mainBom: [
        makeLine({
          id: 'a',
          baseQuantity: 1,
          rate: 1_600_000,
          gstPercent: 18,
          scalingType: 'conditional',
          applicability: { syncTypes: ['HT'] },
        }),
        makeLine({
          id: 'b',
          baseQuantity: 1,
          rate: 100_000,
          gstPercent: 18,
          scalingType: 'fixed',
        }),
      ],
    });
    const out = materializeTemplate({
      template: tpl,
      targetCapacityKW: 500,
      selectedOptions: { mainBomLineIds: [], otherScopeIds: [] },
    });
    const ht = out.materialized.mainLines.find((l) => l.sourceLineId === 'a')!;
    expect(ht.included).toBe(false);
    expect(ht.applicabilityFiltered).toBe(true);
    expect(ht.subtotal).toBe(0);
    expect(out.totals.mainBomSubtotal).toBe(100_000);
  });

  it('optional lines respect selectedOptions', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [
        makeLine({
          id: 'opt',
          baseQuantity: 1,
          rate: 10_000,
          gstPercent: 0,
          scalingType: 'optional',
          isOptional: true,
          includedByDefault: false,
        }),
      ],
    });
    const off = materializeTemplate({
      template: tpl,
      targetCapacityKW: 1000,
      selectedOptions: { mainBomLineIds: [], otherScopeIds: [] },
    });
    expect(off.totals.mainBomSubtotal).toBe(0);

    const on = materializeTemplate({
      template: tpl,
      targetCapacityKW: 1000,
      selectedOptions: { mainBomLineIds: ['opt'], otherScopeIds: [] },
    });
    expect(on.totals.mainBomSubtotal).toBe(10_000);
  });

  it('per-kW rate is 0 when target capacity is 0', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [makeLine({ id: 'a', baseQuantity: 1, rate: 1000, gstPercent: 0 })],
    });
    const out = materializeTemplate({
      template: tpl,
      targetCapacityKW: 0,
      selectedOptions: { mainBomLineIds: [], otherScopeIds: [] },
    });
    expect(out.totals.perKwRate).toBe(0);
  });
});

describe('defaultSelectedOptionsFor', () => {
  it('includes optional default-on lines, omits default-off', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [
        makeLine({ id: 'on', isOptional: true, includedByDefault: true }),
        makeLine({ id: 'off', isOptional: true, includedByDefault: false }),
        makeLine({ id: 'req' }),
      ],
      otherScope: [
        makeScope({ id: 's_on', isOptional: true, includedByDefault: true }),
        makeScope({ id: 's_off', isOptional: true, includedByDefault: false }),
      ],
    });
    const opts = defaultSelectedOptionsFor(tpl);
    expect(opts.mainBomLineIds).toEqual(['on']);
    expect(opts.otherScopeIds).toEqual(['s_on']);
  });
});

describe('computeTotals', () => {
  it('skips excluded lines from subtotals', () => {
    const totals = computeTotals(
      [
        {
          id: 'a',
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

/* ------------------------------------------------------------------------ */
/* Validation                                                                */
/* ------------------------------------------------------------------------ */

describe('validateTemplate', () => {
  it('flags missing name and version', () => {
    const tpl = tplOf({ baseCapacityKW: 1000, mainBom: [] });
    tpl.name = '';
    tpl.version = '';
    const issues = validateTemplate(tpl);
    expect(issues.some((i) => i.path === 'name')).toBe(true);
    expect(issues.some((i) => i.path === 'version')).toBe(true);
  });

  it('flags step lines missing unitCapacityKW', () => {
    const tpl = tplOf({
      baseCapacityKW: 1000,
      mainBom: [
        makeLine({ id: 's', scalingType: 'step' }), // no unitCapacityKW
      ],
    });
    const issues = validateTemplate(tpl);
    expect(
      issues.some((i) => i.path === 'mainBom[0].unitCapacityKW')
    ).toBe(true);
  });

  it('seed templates pass validation', () => {
    for (const tpl of seedTemplates()) {
      expect(validateTemplate(tpl)).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------------ */
/* Seed templates                                                            */
/* ------------------------------------------------------------------------ */

describe('seedTemplates', () => {
  it('exposes the two PRD example templates', () => {
    const tpls = seedTemplates();
    expect(tpls.map((t) => t.id).sort()).toEqual(
      [SEED_TEMPLATE_ID_HT, SEED_TEMPLATE_ID_LT].sort()
    );
  });

  it('HT template materialises with sane totals at base capacity', () => {
    const tpls = seedTemplates();
    const ht = tpls.find((t) => t.id === SEED_TEMPLATE_ID_HT)!;
    const out = materializeTemplate({
      template: ht,
      targetCapacityKW: 1000,
      selectedOptions: defaultSelectedOptionsFor(ht),
    });
    expect(out.totals.grandTotal).toBeGreaterThan(0);
    expect(out.totals.perKwRate).toBeGreaterThan(0);
    expect(out.materialized.mainLines.length).toBe(ht.mainBom.length);
  });

  it('LT template excludes HT-only switchyard lines', () => {
    const tpls = seedTemplates();
    const lt = tpls.find((t) => t.id === SEED_TEMPLATE_ID_LT)!;
    const out = materializeTemplate({
      template: lt,
      targetCapacityKW: 700,
      selectedOptions: defaultSelectedOptionsFor(lt),
    });
    // No HT-gated line should be included.
    const filtered = out.materialized.mainLines.filter(
      (l) => l.applicabilityFiltered
    );
    // LT template doesn't ship HT lines; filter should be empty here.
    expect(filtered.length).toBe(0);
    expect(out.totals.grandTotal).toBeGreaterThan(0);
  });
});
