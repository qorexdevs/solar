import { describe, expect, it } from 'vitest';
import type { MaterialCatalogItem, ScenarioTemplate, TemplateFacet } from '@/types';
import { seedMaterialCatalog } from '@/lib/catalog';
import { defaultSelectionsFromFacets } from '@/lib/estimate';
import { seedFacets } from '@/lib/facets';
import { seedTemplates } from '@/lib/templates';
import { composeEstimate, defaultSelectedOptionsFromSelections } from './compose';

describe('composeEstimate (integration)', () => {
  it('produces sane totals using seeded facets, templates, and catalog defaults', () => {
    const facets = seedFacets();
    const templates = seedTemplates();
    const catalogItems = seedMaterialCatalog();
    const byId = new Map(templates.map((t) => [t.id, t]));
    const selections = defaultSelectionsFromFacets(facets, byId);
    const selectedOptionsPerTemplate =
      defaultSelectedOptionsFromSelections(selections, byId);

    const { totals, materialized } = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      targetCapacityKW: 1000,
      catalogItems,
      templates,
    });

    expect(totals.grandTotal).toBeGreaterThan(0);
    expect(totals.perKwRate).toBeGreaterThan(0);
    expect(
      materialized.mainLines.length + materialized.otherLines.length
    ).toBeGreaterThan(0);
  });

  it('merges duplicated catalog BOM rows using compose overrides', () => {
    const facets: TemplateFacet[] = [
      { id: 'f1', name: 'Facet 1', description: '', sequence: 10, required: true },
      { id: 'f2', name: 'Facet 2', description: '', sequence: 20, required: true },
    ];
    const t0 = Date.now();

    const cat: MaterialCatalogItem = {
      id: 'catalog_dup_line',
      name: 'Merged line',
      kind: 'bom',
      category: 'misc',
      uom: 'count',
      defaultRate: 100,
      gstPercent: 0,
      defaultComposeMode: 'sum',
      status: 'active',
      createdAt: t0,
      updatedAt: t0,
    };

    const templates: ScenarioTemplate[] = [
      {
        id: 'tb1',
        facetId: 'f1',
        name: 'TB1',
        baseCapacityKW: 1000,
        syncType: 'HT',
        projectType: 'utility',
        status: 'active',
        version: 'v1',
        effectiveFrom: t0,
        source: 'manual',
        createdAt: t0,
        updatedAt: t0,
        lines: [
          {
            id: 'ln1',
            catalogItemId: cat.id,
            sequence: 1,
            baseQuantity: 10,
            scalingType: 'fixed',
            isOptional: false,
            includedByDefault: true,
          },
        ],
      },
      {
        id: 'tb2',
        facetId: 'f2',
        name: 'TB2',
        baseCapacityKW: 1000,
        syncType: 'HT',
        projectType: 'utility',
        status: 'active',
        version: 'v1',
        effectiveFrom: t0,
        source: 'manual',
        createdAt: t0,
        updatedAt: t0,
        lines: [
          {
            id: 'ln2',
            catalogItemId: cat.id,
            sequence: 1,
            baseQuantity: 25,
            scalingType: 'fixed',
            composeModeOverride: 'max',
            isOptional: false,
            includedByDefault: true,
          },
        ],
      },
    ];

    const selections = {
      f1: { templateId: 'tb1', selectedVersion: 'v1' },
      f2: { templateId: 'tb2', selectedVersion: 'v1' },
    };
    const selectedOptionsPerTemplate = defaultSelectedOptionsFromSelections(
      selections,
      new Map(templates.map((t) => [t.id, t]))
    );

    const summed = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      composeOverrides: { [cat.id]: 'sum' },
      targetCapacityKW: 1000,
      catalogItems: [cat],
      templates,
      engineFacetId: 'f1',
    });
    expect(summed.materialized.mainLines).toHaveLength(1);
    expect(summed.materialized.mainLines[0]?.quantity).toBe(35);

    const maxed = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      composeOverrides: { [cat.id]: 'max' },
      targetCapacityKW: 1000,
      catalogItems: [cat],
      templates,
      engineFacetId: 'f1',
    });
    expect(maxed.materialized.mainLines[0]?.quantity).toBe(25);

    /** Default catalogue mode is sum but T2's line override walks last → max. */
    const resolved = composeEstimate({
      facets,
      selections,
      selectedOptionsPerTemplate,
      targetCapacityKW: 1000,
      catalogItems: [{ ...cat, defaultComposeMode: 'sum' }],
      templates,
      engineFacetId: 'f1',
    });
    expect(resolved.materialized.mainLines[0]?.quantity).toBe(25);
  });
});
