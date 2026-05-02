import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOM_BY_PROJECT_TYPE,
  DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE,
  applyCatalogDefaults,
  buildLegacyCatalog,
  deriveMaterials,
  getCatalogDefaults,
  makeSeedCatalog,
  quantityFor,
  resolveCatalog,
} from '.';
import { createScenario } from '../scenario';
import type { BOMTemplate, ManualOverrides, Materials } from '@/types';

describe('quantityFor', () => {
  it('linear: scales with sizeMW for kW unit and rounds to whole kW', () => {
    const rule = { unit: 'kW', perMW: 1000, scaleMode: 'linear' } as const;
    expect(quantityFor(rule, 1)).toBe(1000);
    expect(quantityFor(rule, 2.5)).toBe(2500);
    expect(quantityFor(rule, 0.05)).toBe(50);
  });

  it('linear: scales counts and rounds', () => {
    const rule = { unit: 'count', perMW: 5, scaleMode: 'linear' } as const;
    expect(quantityFor(rule, 1)).toBe(5);
    expect(quantityFor(rule, 0.5)).toBe(3); // round(2.5) = 3
    expect(quantityFor(rule, 2)).toBe(10);
  });

  it('linear: keeps fractional lots un-rounded', () => {
    const rule = { unit: 'lot', perMW: 1, scaleMode: 'linear' } as const;
    expect(quantityFor(rule, 0.5)).toBe(0.5);
    expect(quantityFor(rule, 2.5)).toBe(2.5);
  });

  it('fixed: ignores sizeMW', () => {
    const rule = { unit: 'count', perMW: 1, scaleMode: 'fixed' } as const;
    expect(quantityFor(rule, 5)).toBe(1);
    expect(quantityFor(rule, 0)).toBe(1);
  });

  it('returns 0 quantity for non-positive size on linear rules', () => {
    const rule = { unit: 'kW', perMW: 1000, scaleMode: 'linear' } as const;
    expect(quantityFor(rule, 0)).toBe(0);
    expect(quantityFor(rule, -1)).toBe(0);
    expect(quantityFor(rule, Number.NaN)).toBe(0);
  });
});

describe('deriveMaterials', () => {
  const catalog = makeSeedCatalog();

  it('produces a Materials object covering every standard key', () => {
    const m = deriveMaterials({
      sizeMW: 1.5,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
    });
    expect(m.panels.quantity).toBe(1500);
    expect(m.panels.unitCost).toBe(catalog.prices.panels.unitPrice);
    expect(m.inverters.quantity).toBe(8); // round(5 × 1.5) = 8
    expect(m.transformers.quantity).toBe(2); // round(1 × 1.5)
    expect(m.cables.quantity).toBeCloseTo(1.5);
    expect(Array.isArray(m.custom)).toBe(true);
  });

  it('different project types yield different inverter & transformer counts', () => {
    const utility = deriveMaterials({
      sizeMW: 2,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
    });
    const commercial = deriveMaterials({
      sizeMW: 2,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.commercial,
      catalog,
    });
    const residential = deriveMaterials({
      sizeMW: 2,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.residential,
      catalog,
    });

    expect(utility.inverters.quantity).toBe(10); // 5/MW × 2MW
    expect(commercial.inverters.quantity).toBe(16); // 8/MW × 2MW
    expect(residential.inverters.quantity).toBe(20); // 10/MW × 2MW
    expect(utility.transformers.quantity).toBe(2);
    expect(residential.transformers.quantity).toBe(0); // fixed at 0
  });

  it('preserves manually overridden unitCost rows from previous Materials', () => {
    const previous: Materials = deriveMaterials({
      sizeMW: 1,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
    });
    previous.panels.unitCost = 30_000; // user-authored

    const overrides: ManualOverrides = {
      materials: { panels: { unitCost: true } },
    };

    const next = deriveMaterials({
      sizeMW: 2,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
      previous,
      overrides,
    });

    // Quantity re-derived (size doubled), unitCost frozen.
    expect(next.panels.quantity).toBe(2000);
    expect(next.panels.unitCost).toBe(30_000);
  });

  it('preserves manually overridden quantity rows from previous Materials', () => {
    const previous: Materials = deriveMaterials({
      sizeMW: 1,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
    });
    previous.inverters.quantity = 7; // user-authored

    const overrides: ManualOverrides = {
      materials: { inverters: { quantity: true } },
    };

    const next = deriveMaterials({
      sizeMW: 3,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
      previous,
      overrides,
    });

    expect(next.inverters.quantity).toBe(7); // not 15
    expect(next.inverters.unitCost).toBe(catalog.prices.inverters.unitPrice);
  });

  it('passes through custom line items unchanged', () => {
    const previous: Materials = deriveMaterials({
      sizeMW: 1,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
    });
    previous.custom = [{ id: 'cu_1', name: 'Permits', unitCost: 50_000, quantity: 1 }];

    const next = deriveMaterials({
      sizeMW: 2,
      bom: DEFAULT_BOM_BY_PROJECT_TYPE.utility,
      catalog,
      previous,
    });

    expect(next.custom).toHaveLength(1);
    expect(next.custom[0]).toEqual({
      id: 'cu_1',
      name: 'Permits',
      unitCost: 50_000,
      quantity: 1,
    });
    // Mutating next.custom should NOT mutate previous.custom (defensive clone).
    next.custom[0].unitCost = 99_999;
    expect(previous.custom[0].unitCost).toBe(50_000);
  });
});

describe('resolveCatalog', () => {
  it('returns the requested catalog by id when present', () => {
    const a = makeSeedCatalog();
    const b = { ...a, id: 'cat_b', label: 'B' };
    expect(resolveCatalog([a, b], 'cat_b', a.id).id).toBe('cat_b');
  });

  it('falls back to active when id is unknown', () => {
    const a = makeSeedCatalog();
    const b = { ...a, id: 'cat_b' };
    expect(resolveCatalog([a, b], 'cat_missing', 'cat_b').id).toBe('cat_b');
  });

  it('falls back to first catalog if active is unknown too', () => {
    const a = makeSeedCatalog();
    expect(resolveCatalog([a], 'cat_missing', 'cat_also_missing').id).toBe(a.id);
  });
});

describe('applyCatalogDefaults', () => {
  const catalog = makeSeedCatalog();

  it('patches basics, revenue, and om from the matching project-type defaults', () => {
    const s = createScenario({ projectType: 'utility' });
    s.basics.cufPct = 99;
    s.basics.lifespanYears = 1;
    s.revenue.ppaEscalationPct = 0;
    s.om.percentOfCapex = 5;

    const out = applyCatalogDefaults(s, catalog, 'commercial');
    const expected = DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.commercial;
    expect(out.basics.cufPct).toBe(expected.cufPct);
    expect(out.basics.lifespanYears).toBe(expected.lifespanYears);
    expect(out.basics.degradationPct).toBe(expected.degradationPct);
    expect(out.basics.inflationPct).toBe(expected.inflationPct);
    expect(out.basics.discountPct).toBe(expected.discountPct);
    expect(out.revenue.ppaEscalationPct).toBe(expected.ppaEscalationPct);
    expect(out.om.percentOfCapex).toBe(expected.omPercentOfCapex);
  });

  it('skips fields flagged in manualOverrides.defaults', () => {
    const s = createScenario({ projectType: 'utility' });
    s.basics.cufPct = 30; // user-tuned
    s.om.percentOfCapex = 4.2; // user-tuned
    s.manualOverrides = {
      defaults: { cufPct: true, omPercentOfCapex: true },
    };

    const out = applyCatalogDefaults(s, catalog, 'commercial');
    // Touched fields keep the user-authored values...
    expect(out.basics.cufPct).toBe(30);
    expect(out.om.percentOfCapex).toBe(4.2);
    // ...but untouched fields still re-apply.
    expect(out.basics.lifespanYears).toBe(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.commercial.lifespanYears
    );
  });

  it('falls back to industry defaults when the catalog lacks an entry', () => {
    const stripped = { ...catalog, defaults: undefined as never };
    expect(getCatalogDefaults(stripped, 'utility')).toEqual(
      DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE.utility
    );
  });
});

describe('buildLegacyCatalog', () => {
  const bom: BOMTemplate = DEFAULT_BOM_BY_PROJECT_TYPE.utility;
  it('captures unit prices from the saved materials', () => {
    const materials: Materials = {
      panels: { id: 'p', name: 'Panels', unitCost: 24_000, quantity: 1500 },
      cables: { id: 'c', name: 'Cables', unitCost: 1_400_000, quantity: 1 },
      inverters: { id: 'i', name: 'Inverters', unitCost: 60_000, quantity: 8 },
      mounting: { id: 'm', name: 'Mounting', unitCost: 1_900_000, quantity: 1 },
      transformers: { id: 't', name: 'Trans', unitCost: 1_600_000, quantity: 2 },
      civil: { id: 'cv', name: 'Civil', unitCost: 2_100_000, quantity: 1 },
      bos: { id: 'b', name: 'BOS', unitCost: 0, quantity: 0 },
      custom: [],
    };
    const cat = buildLegacyCatalog(materials, bom, 1.5, 'cat_legacy_x');
    expect(cat.id).toBe('cat_legacy_x');
    expect(cat.source).toBe('legacy');
    expect(cat.prices.panels.unitPrice).toBe(24_000);
    expect(cat.prices.transformers.unitPrice).toBe(1_600_000);
    // Units mirror the BOM rules.
    expect(cat.prices.panels.unit).toBe('kW');
    expect(cat.prices.cables.unit).toBe('lot');
  });
});
