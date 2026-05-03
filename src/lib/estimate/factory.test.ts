import { describe, expect, it } from 'vitest';
import {
  createEstimate,
  defaultFinanceLayer,
  duplicateEstimate,
  recomputeMaterialization,
  defaultSelectionsFromFacets,
} from './factory';
import {
  seedTemplates,
  SEED_TEMPLATE_ID_HT,
  SEED_TEMPLATE_ID_LT,
} from '@/lib/templates';
import { seedFacets } from '@/lib/facets';
import { seedMaterialCatalog } from '@/lib/catalog';
import type { EstimateFacetSelections, ScenarioTemplate } from '@/types';
import { VOLTAGE_CLASS_FACET_ID } from '@/lib/facets/constants';

function ctx() {
  return {
    facets: seedFacets(),
    templates: seedTemplates(),
    catalogItems: seedMaterialCatalog(),
  };
}

function snapshot(all: ScenarioTemplate[], id: string) {
  const t = all.find((x) => x.id === id)!;
  return { templateId: t.id, selectedVersion: t.version };
}

function composeSelections(patch: Partial<EstimateFacetSelections> = {}) {
  const { facets, templates, catalogItems } = ctx();
  const byId = new Map(templates.map((x) => [x.id, x]));
  const selections = {
    ...defaultSelectionsFromFacets(facets, byId),
    ...patch,
  };
  return { facets, templates, catalogItems, selections, templatesById: byId };
}

describe('createEstimate', () => {
  it('materialises composed defaults at roughly the voltage-template base calibration', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const ht = templates.find((t) => t.id === SEED_TEMPLATE_ID_HT)!;
    const est = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      targetCapacityKW: ht.baseCapacityKW,
    });
    expect(est.targetCapacityKW).toBe(ht.baseCapacityKW);
    expect(est.materialized.mainLines.length).toBeGreaterThan(10);
    expect(est.totals.grandTotal).toBeGreaterThan(0);
    expect(est.selections[VOLTAGE_CLASS_FACET_ID]?.selectedVersion).toBe(ht.version);
  });

  it('respects target capacity scaling across composed templates', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const small = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      targetCapacityKW: 500,
    });
    const big = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      targetCapacityKW: 1500,
    });
    expect(small.totals.grandTotal).toBeLessThan(big.totals.grandTotal);
  });

  it('supports explicit facet selections overriding defaults', () => {
    const { facets, templates, catalogItems } = ctx();
    const lt = templates.find((t) => t.id === SEED_TEMPLATE_ID_LT)!;
    const selections = composeSelections({
      [VOLTAGE_CLASS_FACET_ID]: snapshot(templates, SEED_TEMPLATE_ID_LT),
    }).selections;
    const est = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      targetCapacityKW: lt.baseCapacityKW,
    });
    expect(est.selections[VOLTAGE_CLASS_FACET_ID]?.templateId).toBe(SEED_TEMPLATE_ID_LT);
  });

  it('LT vs HT facets produce different capex totals at identical target kW', () => {
    const { facets, templates, catalogItems } = ctx();

    function estForVoltage(id: string) {
      const selections = composeSelections({
        [VOLTAGE_CLASS_FACET_ID]: snapshot(templates, id),
      }).selections;
      return createEstimate({
        facets,
        templates,
        catalogItems,
        selections,
        targetCapacityKW: 700,
      });
    }

    expect(estForVoltage(SEED_TEMPLATE_ID_HT).totals.grandTotal).not.toBe(
      estForVoltage(SEED_TEMPLATE_ID_LT).totals.grandTotal
    );
  });

  it('omits finance unless requested', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const est = createEstimate({ facets, templates, catalogItems, selections });
    expect(est.finance).toBeUndefined();
  });

  it('attaches finance when explicit', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const est = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      finance: defaultFinanceLayer(true),
    });
    expect(est.finance?.enabled).toBe(true);
  });
});

describe('recomputeMaterialization', () => {
  it('updates totals after target capacity shifts', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const small = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      targetCapacityKW: 400,
    });
    const grown = recomputeMaterialization(
      { ...small, targetCapacityKW: 1500 },
      { facets, templates, catalogItems }
    );
    expect(grown.totals.grandTotal).toBeGreaterThan(small.totals.grandTotal);
  });

  it('syncs template versions referenced in facet selections', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const ht = structuredClone(templates.find((t) => t.id === SEED_TEMPLATE_ID_HT)!);

    /** Mutate cloned template versions without touching persisted store ids */
    ht.version = 'v99';
    const est = createEstimate({
      facets,
      templates: templates.map((t) => (t.id === ht.id ? ht : t)),
      catalogItems,
      selections,
    });

    expect(est.selections[VOLTAGE_CLASS_FACET_ID]?.selectedVersion).toBe('v99');

    const bumpedTpl = {
      ...ht,
      version: 'v77',
      lines: [...ht.lines],
    };
    const re = recomputeMaterialization(est, {
      facets,
      catalogItems,
      templates: templates.map((t) => (t.id === bumpedTpl.id ? bumpedTpl : t)),
    });

    expect(re.selections[VOLTAGE_CLASS_FACET_ID]?.selectedVersion).toBe('v77');
  });
});

describe('duplicateEstimate', () => {
  it('deep-clones BOM rows with independent ids but equal economics', () => {
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const original = createEstimate({ facets, templates, catalogItems, selections });
    const copy = duplicateEstimate(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toContain('(copy)');
    expect(copy.materialized.mainLines.map((x) => x.quantity)).toEqual(
      original.materialized.mainLines.map((x) => x.quantity)
    );
    copy.materialized.mainLines[0].quantity = 9999;
    expect(original.materialized.mainLines[0].quantity).not.toBe(9999);
  });
});

describe('defaultFinanceLayer', () => {
  it('is disabled unless requested', () => {
    expect(defaultFinanceLayer().enabled).toBe(false);
  });

  it('finance defaults integrate with composeEstimate-derived estimates', () => {
    const f = defaultFinanceLayer(true);
    const { facets, templates, catalogItems, selections } = composeSelections({});
    const est = createEstimate({
      facets,
      templates,
      catalogItems,
      selections,
      finance: f,
    });
    expect(est.finance?.financing.termYears).toBe(25);
    expect(est.totals.grandTotal).toBeGreaterThan(0);
  });
});
